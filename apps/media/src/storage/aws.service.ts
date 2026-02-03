import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MediaConvertClient,
  DescribeEndpointsCommand,
  CreateJobCommand,
} from '@aws-sdk/client-mediaconvert';
import { randomUUID } from 'crypto';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private s3: S3Client;
  private region: string;
  private _bucket: string;
  private cachedMcEndpoint?: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-southeast-1';
    this._bucket = process.env.VIDEO_BUCKET || 'skllr-media-video';
    this.s3 = new S3Client({ region: this.region });
  }

  async createPresignedUploadUrl(
    key: string,
    contentType: string,
    expires = 3600,
  ) {
    const cmd = new PutObjectCommand({
      Bucket: this._bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: expires });
    return url;
  }

  // expose bucket property for StorageProvider compatibility
  get bucket() {
    return this._bucket;
  }

  // Storage-compatible presign helpers
  async presignPut(
    bucket: string,
    key: string,
    contentType: string,
    expires = 3600,
  ) {
    const cmd = new PutObjectCommand({
      Bucket: bucket || this._bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expires });
  }

  async presignedPutObject(bucket: string, key: string, expires = 3600) {
    // older callers might not supply contentType; return URL
    const cmd = new PutObjectCommand({
      Bucket: bucket || this._bucket,
      Key: key,
      ACL: 'private',
    });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expires });
  }

  async presignGet(bucket: string, key: string, expires = 3600) {
    const cmd = new GetObjectCommand({
      Bucket: bucket || this._bucket,
      Key: key,
    });
    return await getSignedUrl(this.s3, cmd, { expiresIn: expires });
  }

  async presignedGetObject(bucket: string, key: string, expires = 3600) {
    return this.presignGet(bucket, key, expires);
  }

  // putObject: support either object param or positional args
  async putObject(...args: any[]) {
    let bucket: string, key: string, body: any, contentType: string | undefined;
    if (args.length === 1 && typeof args[0] === 'object') {
      const p = args[0];
      bucket = p.bucket ?? this._bucket;
      key = p.key;
      body = p.body;
      contentType = p.contentType;
    } else {
      bucket = args[0] ?? this._bucket;
      key = args[1];
      body = args[2];
      const maybeMeta = args[4] ?? args[3];
      contentType =
        maybeMeta && maybeMeta['Content-Type']
          ? maybeMeta['Content-Type']
          : undefined;
    }
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.s3.send(cmd);
  }

  async deleteObject(...args: any[]) {
    let bucket: string, key: string;
    if (args.length === 1 && typeof args[0] === 'object') {
      bucket = args[0].bucket ?? this._bucket;
      key = args[0].key;
    } else {
      bucket = args[0] ?? this._bucket;
      key = args[1];
    }
    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await this.s3.send(cmd);
  }

  buildPublicUrl(bucket: string, key: string) {
    // public https URL for S3-compatible endpoints
    const endpoint = process.env.S3_ENDPOINT || '';
    if (endpoint.startsWith('http')) {
      return `${endpoint}/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private async getMediaConvertEndpoint(): Promise<string> {
    if (this.cachedMcEndpoint) return this.cachedMcEndpoint;

    const client = new MediaConvertClient({ region: this.region });
    const res = await client.send(new DescribeEndpointsCommand({}));
    if (!res.Endpoints || res.Endpoints.length === 0) {
      throw new Error('No MediaConvert endpoints returned');
    }

    this.cachedMcEndpoint = res.Endpoints[0].Url!;
    this.logger.log(`MediaConvert endpoint: ${this.cachedMcEndpoint}`);
    return this.cachedMcEndpoint;
  }

  // Create a MediaConvert job to transcode video
  async createMediaConvertJob(
    inputS3Url: string,
    outputS3Prefix: string,
    roleArn: string,
  ) {
    const endpoint = await this.getMediaConvertEndpoint();
    const mc = new MediaConvertClient({
      region: this.region,
      endpoint, // use account-specific endpoint
    });

    // Basic job template producing HLS with 3 renditions.
    // You can expand codecs/bitrates as needed.
    const jobSettings: any = {
      OutputGroups: [
        {
          Name: 'Apple HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: `s3://${this._bucket}/${outputS3Prefix}`,
              SegmentLength: 6,
              MinSegmentLength: 0,
            },
          },

          Outputs: [
            // 1080p
            {
              ContainerSettings: {
                Container: 'M3U8',
                M3u8Settings: {},
              },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 6500000,
                    CodecProfile: 'MAIN',
                    Height: 1080,
                    Width: 1920,
                    MaxBitrate: 6500000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
            },

            // 720p
            {
              ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 3500000,
                    CodecProfile: 'MAIN',
                    Height: 720,
                    Width: 1280,
                    MaxBitrate: 3500000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
            },

            // 360p
            {
              ContainerSettings: { Container: 'M3U8', M3u8Settings: {} },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'CBR',
                    Bitrate: 800000,
                    CodecProfile: 'MAIN',
                    Height: 360,
                    Width: 640,
                    MaxBitrate: 800000,
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 64000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      AdAvailOffset: 0,
      Inputs: [
        {
          FileInput: inputS3Url,
        },
      ],
    };

    const createJobCmd = new CreateJobCommand({
      Role: roleArn,
      Settings: jobSettings,
    });

    const res = await mc.send(createJobCmd);
    this.logger.log(`MediaConvert job created: ${res.Job?.Id}`);
    return res.Job;
  }

  generateVideoId() {
    return randomUUID().replace(/-/g, '').slice(0, 12); // shorter id
  }
}
