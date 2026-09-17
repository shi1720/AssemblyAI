import Link from "next/link";
export const metadata = { title: "Privacy & data — Benchback" };
export default function Privacy() {
  return (
    <main className="privacy">
      <Link className="text-link" href="/">
        ← Back to Benchback
      </Link>
      <h1 style={{ marginTop: 24 }}>
        Your shop’s records stay your shop’s records.
      </h1>
      <p>
        Benchback is a hackathon application created by Shivam Gupta. It
        prepares and tracks parts-core returns; suppliers decide acceptance and
        credit. The public example contains fictional data and resets when
        refreshed.
      </p>
      <h2>What is stored</h2>
      <p>
        Signed-in workspaces store purchase identifiers, supplier policies,
        inspection observations, correction history, dispatch and receipt
        references, credit-memo entries and final conversation transcripts.
        Identity comes from Sign in with ChatGPT. Records are scoped to the
        signed-in account.
      </p>
      <h2>Voice processing</h2>
      <p>
        Starting a voice conversation sends microphone audio to AssemblyAI for
        speech recognition, reasoning and spoken responses. Benchback does not
        retain audio files. AssemblyAI’s own processing and retention terms
        apply. The browser submits transcript text and tool requests to
        Benchback; these are not cryptographically authenticated recordings.
      </p>
      <p>
        <a
          className="text-link"
          href="https://www.assemblyai.com/legal/privacy-policy"
          target="_blank"
          rel="noreferrer"
        >
          AssemblyAI privacy policy
        </a>
      </p>
      <h2>Hosting and access</h2>
      <p>
        The deployed application uses Cloudflare Workers and D1 through OpenAI
        Sites. The hosting platform provides sign-in and forwards authenticated
        identity to the application. API keys remain server-side. Voice uses
        short-lived, single-use tokens, bounded sessions and issuance quotas.
      </p>
      <h2>Control and retention</h2>
      <p>
        Export your records as CSV and individual evidence packages as JSON.
        Records remain until removed through workspace deletion or the hosting
        administrator’s retention process. Download anything you need before
        deleting a workspace. Provider logs or backups may follow separate
        retention schedules.
      </p>
      <h2>What the agent cannot do</h2>
      <p>
        The agent cannot approve returns, initiate shipments, issue refunds,
        post financial credits, access bank accounts or override supplier
        requirements. Human users confirm those records against their actual
        source documents. Do not enter payment credentials, customer personal
        data, hazardous-material instructions or secrets into a conversation.
      </p>
      <p>
        For project questions or a data request, use the repository’s contact
        guidance. Do not publish private business records in public GitHub
        issues.
      </p>
      <p style={{ fontSize: 13 }}>Last updated: September 17, 2026.</p>
    </main>
  );
}
