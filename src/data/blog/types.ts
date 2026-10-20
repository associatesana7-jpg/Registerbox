export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  category: 'Start a business' | 'Registrations' | 'GST & records' | 'Grow & comply';
  serviceCategory: string;
  image: 'formation' | 'food' | 'records';
  imageAlt: string;
  intro: string[];
  sections: { id: string; heading: string; paragraphs: string[]; bullets?: string[]; sourceIds?: string[] }[];
  faqs: { question: string; answer: string }[];
  sources: { id: string; title: string; url: string }[];
  searchQuestions: string[];
  relatedSlugs: string[];
};
