export type BlogVideo = {
  title: string;
  description: string;
  src: string;
  poster: string;
  captions: string;
  duration: string;
  uploadDate: string;
  transcript: string;
  language: 'hi-IN' | 'en-IN';
  width?: number;
  height?: number;
};

const gstExplained: BlogVideo = {
  title: 'GST क्या है और कैसे काम करता है?',
  description: 'आशा के उदाहरण से GST, बिक्री पर टैक्स और पात्र इनपुट टैक्स क्रेडिट को आसान हिंदी में समझें। वीडियो में 18% दर सिर्फ गणना का उदाहरण है, हर कारोबार की दर नहीं।',
  src: '/media/gst-explained-reel.mp4',
  poster: '/media/gst-explained-poster.jpg',
  captions: '/media/gst-explained-hi.vtt',
  duration: 'PT1M28.333S',
  uploadDate: '2026-10-26T00:40:47+05:30',
  language: 'hi-IN',
  width: 1080,
  height: 1920,
  transcript: 'GST यानी Goods and Services Tax, goods और services की taxable supply पर लगने वाला indirect tax है। Registered business ग्राहक के बिल में लागू GST लेता है; यह उसकी अतिरिक्त कमाई नहीं है। खरीद पर दिया पात्र GST, बिक्री के GST से नियमों के अनुसार समायोजित हो सकता है। उदाहरण में आशा regular GST में registered हैं और केवल गणना के लिए 18% दर ली गई है। ₹600 की खरीद पर ₹108 GST, कुल ₹708 हैं। ₹1,000 की बिक्री पर ₹180 GST, कुल ₹1,180 हैं। यदि ₹108 का पूरा input tax credit पात्र है और उसका उपयोग अनुमत है, तो ₹180 में से ₹108 घटाने पर ₹72 बचते हैं। वास्तविक टैक्स में दर, tax heads, credit की पात्रता और अन्य नियम जाँचना ज़रूरी है। सही बिल और रिकॉर्ड रखें। GST registration से GSTIN मिलता है। Registration और return की ज़रूरत कारोबार के तथ्यों पर निर्भर है। RegisterBox registration, documents, return preparation और filing में सहायता करता है। Call या WhatsApp करें: +91 81477 77843। registerbox.in।',
};

export const blogVideos: Record<string, BlogVideo> = {
  'what-is-gst': gstExplained,
  'gst-registration-documents-and-address-proof': gstExplained,
  'fast-gst-registration-three-hours': gstExplained,
  "gst-registration-small-ecommerce-sellers-november-2026": {
    "title": "मीरा की कहानी: छोटे ऑनलाइन विक्रेता और GST",
    "description": "मीरा की कहानी से समझें: दूसरे राज्य का मार्केटप्लेस गोदाम, प्रस्तावित नियम 14B, ज़रूरी तैयारी और सुरक्षित भुगतान। स्थिति की समीक्षा: 23 अक्टूबर 2026।",
    "src": "/media/gst-ecommerce-rule14b-explainer.mp4",
    "poster": "/media/gst-ecommerce-rule14b-poster.jpg",
    "captions": "/media/gst-ecommerce-rule14b-hi.vtt",
    "duration": "PT1M32.2S",
    "uploadDate": "2026-10-23T13:57:00+05:30",
    "language": "hi-IN",
    "transcript": "मीरा घर से ऑनलाइन सामान बेचती है। अब उसके ऑर्डर बढ़ रहे हैं। वह दूसरे राज्य के गोदाम में भी अपना सामान रखना चाहती है।\n\nलेकिन पहले उसे कुछ बातें समझनी हैं। सामान किस राज्य में रखा जाएगा? कहाँ से भेजा जाएगा? और क्या इसके लिए अलग जीएसटी नंबर चाहिए?\n\nएक नवंबर, दो हज़ार छब्बीस से एक नई सुविधा शुरू होने की खबर है। पर इसे पक्की तारीख न मानें। आवेदन करने से पहले सरकारी जीएसटी वेबसाइट पर देखें कि सुविधा शुरू हुई है या नहीं।\n\nइस नए तरीके के लिए भी कुछ शर्तें हैं। जैसे, अपने राज्य में जीएसटी नंबर होना और मार्केटप्लेस से गोदाम इस्तेमाल करने की इजाज़त मिलना। इसलिए पहले देखें कि यह तरीका आपके कारोबार के लिए सही है या नहीं।\n\nऔर ढाई लाख रुपये का मतलब आपकी महीने भर की बिक्री नहीं है। यह टैक्स से जुड़ी शर्त है। अपने बिल और बिक्री का हिसाब किसी जानकार से जँचवाएँ।\n\nमीरा पहले अपने कारोबार की जानकारी, पैन, पते, गोदाम की जानकारी और बिक्री के बिल जुटाती है। फिर किसी जानकार की मदद से अपना अगला कदम तय करती है।\n\nरजिस्टरबॉक्स पर जीएसटी रजिस्ट्रेशन में मदद की फीस उन्नीस सौ निन्यानवे रुपये है। इस फीस में जीएसटी नहीं जोड़ा जाता। पहले अपनी जानकारी जमा करें। फिर फीस और मिलने वाली मदद समझकर पेमेंट करें। याद रखें, पेमेंट करने से सरकारी मंज़ूरी की गारंटी नहीं मिलती।"
  }
};
