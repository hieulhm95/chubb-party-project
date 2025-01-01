import { MAPPING_RULES, HOST } from '../configs/configs';
import { FormResponse } from '../types/response';
import {
  getAllRowsWithCells,
  getFileMimeType,
  getFile as getFileService,
} from '../utils/googleApis';
import { mappingDataList, redis } from '../utils/utils';
import { v4 } from 'uuid';
import { InsertOneModel, UpdateOneModel, ObjectId } from 'mongodb';
import MongoDB from '../utils/mongo';
import { createVoice } from './tts.services';
import https from 'https';
import { Readable } from 'stream';
import { BASE_URL } from '../utils/constant';
import * as qrCodeServices from '../services/qrcode.services';
import * as emailServices from '../services/email.services';
import { logger } from '../utils/logger';
import crypto from 'crypto';


async function stepByStepPromise(promiseList: Promise<any>[]) {
  if (promiseList.length == 0) return Promise.resolve();
  const first = promiseList[0];
  promiseList.splice(0, 1);
  await first.then();
  await delay(1);
  return stepByStepPromise(promiseList);
}

function delay(time = 3) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, time * 1000);
  });
}

async function generateQRThenSendMail(mediaId: string, to: string, name: string) {
  const landingPageUrl = `${BASE_URL}/${mediaId}`;
  const qrCode = await qrCodeServices.generateQRCode(landingPageUrl);
  if (!qrCode) {
    return false;
  }
  try {
    await emailServices.sendEmailWithBase64Image(to, qrCode, name);
  } catch (e) {
    logger.error(e);
    return false;
  }

  return true;
}

export async function getResponses() {
  const rows = await getAllRowsWithCells(0);

  const data = mappingDataList<FormResponse>(rows, MAPPING_RULES);
  const length = data.length;

  const db = new MongoDB().getDatabase('localdb');
  const operations: ({ insertOne: InsertOneModel } | { updateOne: UpdateOneModel })[] = [];
  const postOperations = [];
  const collection = db.collection('Response');

  let lastRow = parseInt(await redis.get("lastRow") || "0")
  if (isNaN(lastRow)) lastRow = 0;

  for (let i = lastRow; i < length; i++) {
    const response = data[i];
    
    const md5sum = crypto.createHash('md5');
    md5sum.update(JSON.stringify(response));
    const hashkey = md5sum.digest("hex");

    const isCached = !!(await redis.get(hashkey));

    if(isCached) continue;

    await redis.set(hashkey, "1");

    const email = response.email;
    const receiverEmail = response.receiverEmail;

    const sendMd5sum = crypto.createHash('md5');
    sendMd5sum.update(`${email}:${receiverEmail}`);
    const sentHashkey = sendMd5sum.digest("hex");
    let sentCount = parseInt(await redis.get(sentHashkey) || "0");

    if (sentCount == 2) continue;

    sentCount += 1;

    await redis.set(sentHashkey, sentCount.toString());

    response.mediaId = v4();
    response._id = new ObjectId();
    if (response.filename) {
      const url = new URL(response.filename);
      const id = url.searchParams.get('id');
      if (id) {
        response.fileId = id;
        const mimetype = await getFileMimeType(id);
        response.mimeType = mimetype as string;
      }
    } else if (response.message) {
      postOperations.push(
        createVoice(response.message, response.mediaId as string, response.gender)
      );
    }
    operations.push({
      insertOne: {
        document: response,
      },
    });
    postOperations.push(
      generateQRThenSendMail(response.mediaId, response.receiverEmail, response.receiverName)
    );
  }

  const bulkWriteResponse =
    operations.length == 0
      ? { insertedCount: 0, modifiedCount: 0 }
      : await collection.bulkWrite(operations);

  if (postOperations.length > 0) {
    await stepByStepPromise(postOperations);
  }

  await redis.set("lastRow", length.toString());

  return {
    insertedCount: bulkWriteResponse.insertedCount,
    updatedCount: bulkWriteResponse.modifiedCount,
  };
}

export async function getFile(mediaId: string) {
  const db = new MongoDB().getDatabase('localdb');

  const collection = db.collection('Response');

  const formResponse = await collection.findOne<FormResponse>({ mediaId: mediaId });

  if (formResponse == null) return null;

  if (formResponse.fileId) {
    const fileId = formResponse.fileId;

    return getFileService(fileId);
  } else if (formResponse.messageLink) {
    return new Promise<{
      mimeType: string;
      content: Readable;
    }>((resolve, reject) => {
      https
        .get(formResponse.messageLink, response => {
          response.once('error', err => {
            reject(err);
          });

          resolve({
            mimeType: response.headers['content-type'] as string,
            content: response,
          });
        })
        .once('error', err => {
          reject(err);
        });
    });
  }
  return null;
}

export async function getResponse(mediaId: string) {
  const db = new MongoDB().getDatabase('localdb');

  const collection = db.collection('Response');

  const formResponse = await collection.findOne<FormResponse>({ mediaId: mediaId });

  if (formResponse == null) return null;

  // if(formResponse.filename)
  formResponse.mediaLink =
    HOST + "/" + formResponse.mediaId + '.mp3';

  return formResponse;
}
