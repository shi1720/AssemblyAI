import { spawnSync } from 'node:child_process';
const project = process.env.BENCHBACK_GCP_PROJECT || 'gen-lang-client-0444960702';
const region = 'us-central1';
const image = `${region}-docker.pkg.dev/${project}/benchback/app:${Date.now()}`;
function run(command,args) {
  const result=spawnSync(command,args,{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
// Secrets are already provisioned in Secret Manager. Never put keys in build args.
run('gcloud',['builds','submit','--project',project,'--tag',image,'--quiet']);
run('gcloud',['run','deploy','benchback','--project',project,'--region',region,'--image',image,
  '--service-account',`benchback-runtime@${project}.iam.gserviceaccount.com`,
  '--allow-unauthenticated','--min-instances=0','--max-instances=3','--memory=512Mi','--cpu=1','--concurrency=40','--timeout=300',
  '--set-env-vars',`^|^GOOGLE_CLOUD_PROJECT=${project}|FIRESTORE_DATABASE_ID=benchback|APP_ORIGINS=https://benchback-ai.web.app,https://benchback-ai.firebaseapp.com`,
  '--set-secrets','ASSEMBLYAI_API_KEY=benchback-assemblyai-key:latest','--quiet']);
run('npx',['--yes','firebase-tools@15.30.1','deploy','--only','hosting,firestore:rules','--project',project,'--non-interactive']);
console.log('Deployed https://benchback-ai.web.app');
