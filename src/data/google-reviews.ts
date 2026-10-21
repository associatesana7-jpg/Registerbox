// Public Google Maps listing, read on 22 October 2026. This is an editorial
// snapshot, not a live feed. Preserve reviewers' wording when refreshing it.
// Source: https://www.google.com/maps?cid=13439752852292529636
// Google rounds the listing's aggregate rating to one decimal place.
export const googleReviewSnapshot = {
  rating: '5.0',
  count: 102,
  checkedAt: '2026-10-22',
  checkedLabel: '22 Oct 2026',
  reviewsUrl: 'https://www.google.com/maps/place/RegisterBox/@12.9547917,77.6944716,17z/data=!4m8!3m7!1s0x3bae133bfd4d49ef:0xba83980325f06de4!8m2!3d12.9547917!4d77.6944716!9m1!1b1!16s%2Fg%2F11h9mkqwlq?hl=en',
};

export const googleReviews = [
  {
    id: 'ni-shanz', name: 'NI_ SHANZ', initials: 'NS', localGuide: true,
    color: 'blue', rating: 5,
    text: 'Great service! The team was fast, professional, and easy to communicate with. Everything was handled smoothly. Highly recommended.',
  },
  {
    id: 'akash-builder', name: 'Akash Builder', initials: 'AB', localGuide: false,
    color: 'green', rating: 5,
    text: 'I had an excellent experience with RegisterBox. My food license was processed smoothly, quickly, and professionally.',
    continuation: 'I have personally known Bhav for the past 15 years, and she is honest, knowledgeable, and always ready to help. I highly recommend RegisterBox to anyone looking for business registration or documentation services. She will guide you through the entire process and ensure everything is completed accurately and on time.\nThank you, Bhav, for the excellent service. Keep up the great work!',
  },
  {
    id: 'dinesh-lunawat', name: 'dinesh lunawat', initials: 'DL', localGuide: true,
    color: 'peach', rating: 5,
    text: 'Very prompt service !!\nVery smooth & seamless. Professional too…\nNo inconvenience caused to the clients and the service delivery is quick & transparent.',
  },
  {
    id: 'manya-c', name: 'Manya C', initials: 'MC', localGuide: false,
    color: 'purple', rating: 5,
    text: 'Very smooth and professional service, didn’t face any issues throughout. Made the entire process much easier than expected.',
  },
] as const;
