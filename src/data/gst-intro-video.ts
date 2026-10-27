const publicSiteUrl = 'https://www.registerbox.in';

export const gstIntroVideo = {
  title: 'GST filing in RegisterBox: real app walkthrough',
  description: 'A 72-second walkthrough of the real RegisterBox app, from email sign-in and GST connection to reviewing, authorizing and tracking example nil GSTR-1 and GSTR-3B returns. Uses a sample business and illustrative filing results; no government submission.',
  caption: 'See GST filing in the real app, from sign-in to acknowledgement.',
  src: '/videos/gst-intro.mp4',
  poster: '/videos/gst-intro-poster.webp',
  watchPath: '/watch/gst-filing',
  duration: 'PT1M12S',
  durationSeconds: 72,
  uploadDate: '2026-10-27T11:15:35+05:30',
  width: 1440,
  height: 1080,
} as const;

export const gstIntroWalkthrough = [
  { start: 0, time: '0:00', title: 'Sign in with email', detail: 'Enter your email and use the sign-in code to open your RegisterBox workspace.' },
  { start: 6, time: '0:06', title: 'Add your business', detail: 'Enter a GSTIN, review the fetched business profile and save it to your workspace. The example uses Aarav Studio.' },
  { start: 13, time: '0:13', title: 'Connect GST', detail: 'Review the connection consent and verify the separate GST login code.' },
  { start: 21, time: '0:21', title: 'Choose the return period', detail: 'Open the GST workspace and select September 2026 for the sample monthly filer.' },
  { start: 27, time: '0:27', title: 'Review the nil declaration', detail: 'Check the eligibility questions and signatory details before continuing with the example nil GSTR-1.' },
  { start: 35, time: '0:35', title: 'Authorize GSTR-1', detail: 'Review the business, form and period, then give the filing consent and enter the authorization code shown in the example.' },
  { start: 50, time: '0:50', title: 'Review the example acknowledgement', detail: 'See the sample GSTR-1 receipt. It is labelled “EXAMPLE—NOT FILED”.' },
  { start: 56, time: '0:56', title: 'Review and authorize GSTR-3B', detail: 'Complete the separate nil GSTR-3B review and authorization. Each return has its own filing action.' },
  { start: 64, time: '1:04', title: 'Find both filing records', detail: 'Review the sample GSTR-3B acknowledgement and the history showing the two illustrative return records.' },
] as const;

export const gstIntroVideoSchema: Record<string, unknown> = {
  '@type': 'VideoObject',
  '@id': `${publicSiteUrl}${gstIntroVideo.watchPath}#video`,
  name: gstIntroVideo.title,
  description: gstIntroVideo.description,
  thumbnailUrl: [`${publicSiteUrl}${gstIntroVideo.poster}`],
  uploadDate: gstIntroVideo.uploadDate,
  duration: gstIntroVideo.duration,
  contentUrl: `${publicSiteUrl}${gstIntroVideo.src}`,
  url: `${publicSiteUrl}${gstIntroVideo.watchPath}`,
  mainEntityOfPage: `${publicSiteUrl}${gstIntroVideo.watchPath}`,
  inLanguage: 'en-IN',
  width: gstIntroVideo.width,
  height: gstIntroVideo.height,
  isAccessibleForFree: true,
  creator: { '@type': 'Organization', name: 'RegisterBox', url: publicSiteUrl },
  publisher: { '@id': `${publicSiteUrl}/#organization` },
};
