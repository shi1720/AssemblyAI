# Benchback delivery record

Created by Shivam Gupta. Verified September 17, 2026.

## Published

- Public application: https://benchback-ai.web.app
- Accepted AssemblyAI hackathon submission: https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon/benchback/benchback-from-parts-shelf-to-paid-back
- Public repository, default branch main: https://github.com/shi1720/AssemblyAI
- Final video: [benchback-demo.mp4](benchback-demo.mp4)
- Captions: [benchback-demo.srt](benchback-demo.srt)
- Deck: [PDF](benchback-pitch.pdf) and [PowerPoint](benchback-pitch.pptx)
- Full story: [07-project-story.md](07-project-story.md)
- Video metadata and testing instructions: [08-youtube-metadata.md](08-youtube-metadata.md)

The platform displayed “You have successfully submitted your project for the AssemblyAI - Voice Agent Hackathon event!” The public entry exposes the video player, presentation, GitHub and app links. Its video duration is 171.754687 seconds, with readyState 4 and no media error. An unauthenticated HTTP request returned 200, and the public video storage checksum matched the final local MP4.

YouTube publication completed after Shivam confirmed the upload terms on September 17, 2026. [Watch the public video](https://www.youtube.com/watch?v=cE8brWgJIUY). YouTube displayed “Video published.” The signed-out watch page showed the correct title and creator, English captions, chapters and the 1080p HD option. The final SRT was uploaded as the English caption track; the cover and AI-use disclosure were set. YouTube checks reported no issues.

## Verification

92 automated tests passed, plus 11 assertions in the real-provider hosted voice run. Manual browser checks exercised authentication, separate workspaces, return approval, PDF export, dispatch, receipt, partial credit, final credit, persistence and responsive layouts. Production runtime is Cloud Run revision benchback-00004-xqv behind Firebase Hosting. [Detailed QA](../docs/qa-report.md).

The provider test sends synthetic technician speech. Physical browser microphone capture could not be completed in this environment; its permission timeout and recovery were verified. Customer demand, workshop audio, backups restoration and broader operational readiness remain pilot work. No customer savings or production SLA is claimed.

## Video integrity

- File: submission/benchback-demo.mp4
- Size: 6,980,029 bytes
- SHA256: 24d0cfd07822f4bced40f6a0ed8b12456c5e77850f426a2fc49c4d9a50dcc864
- H.264 1920×1080, 30 fps; AAC stereo 48 kHz
- Audio: -16.39 LUFS; -4.38 dB true peak
- Actual hosted UI captures, edited stills, AI-generated narration, and real AssemblyAI response audio. Fictional data and synthetic technician speech are disclosed.
