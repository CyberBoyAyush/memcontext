import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { env } from "../env.js";

interface UploadDocumentObjectParams {
  workspaceId: string;
  userId: string;
  filename: string;
  contentType: string;
  body: Uint8Array;
}

function requireR2Config() {
  const missing = [
    ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET_NAME", env.R2_BUCKET_NAME],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(
      `R2 is not configured. Missing: ${missing.map(([key]) => key).join(", ")}`,
    );
  }

  return {
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    bucketName: env.R2_BUCKET_NAME!,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  };
}

function getR2Client() {
  const config = requireR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function sanitizeFilename(filename: string) {
  return filename
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

export async function uploadDocumentObject(params: UploadDocumentObjectParams) {
  const config = requireR2Config();
  const safeFilename = sanitizeFilename(params.filename || "document");
  const extension = extname(safeFilename);
  const key = [
    "context-vault",
    params.workspaceId,
    params.userId,
    `${Date.now()}-${randomUUID()}${extension}`,
  ].join("/");

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: {
        filename: safeFilename,
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
    }),
  );

  return {
    storageKey: key,
    publicUrl: config.publicBaseUrl
      ? `${config.publicBaseUrl.replace(/\/+$/, "")}/${key}`
      : null,
  };
}

export async function deleteDocumentObject(storageKey: string) {
  const config = requireR2Config();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: storageKey,
    }),
  );
}
