import { NextFunction, Request, Response } from 'express';
import * as generateServices from '../services/generate.services';

export async function getResponses(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await generateServices.getResponses();
    return res.json(response);
  } catch (err) {
    console.error(`Error while GET responses`, (err as any).message);
    next(err);
  }
}

export async function getFile(req: Request, res: Response){
  const mediaId = req.params.mediaId as string;
  if(!mediaId) {
    res.status(404).send("Media not found");
  }

  const result = await generateServices.getFile(mediaId);
  if(result == null) {
    return res.status(404).send("Media not found");
  }

  res.setHeader("Content-Type", result.mimeType as string);

  result.content.pipe(res);
}

export async function getResponse(req: Request, res: Response){
  const mediaId = req.params.mediaId as string;
  if(!mediaId) {
    res.status(404).send("Media not found");
  }

  const result = await generateServices.getResponse(mediaId);
  if(result == null) {
    return res.status(404).send("Media not found");
  }

  return res.status(200).json(result);
}