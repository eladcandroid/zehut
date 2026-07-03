// Sets a 7-day expiration on all objects in the zehut-downloads R2 bucket.
// This caps storage growth so cached downloads can't run away on cost.
import { S3Client, PutBucketLifecycleConfigurationCommand, GetBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

await client.send(new PutBucketLifecycleConfigurationCommand({
  Bucket: env.R2_BUCKET,
  LifecycleConfiguration: {
    Rules: [
      {
        ID: 'expire-cached-downloads-after-7-days',
        Status: 'Enabled',
        Filter: { Prefix: '' },
        Expiration: { Days: 7 },
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
      },
    ],
  },
}));

console.log('Lifecycle rule applied.');
const res = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: env.R2_BUCKET }));
console.log('Active rules:', JSON.stringify(res.Rules, null, 2));
