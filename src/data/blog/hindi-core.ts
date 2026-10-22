export type HindiBlogContent = {
  title: string;
  description: string;
  intro: string[];
  sections: Record<string, { heading: string; paragraphs: string[]; bullets?: string[] }>;
  faqs: { question: string; answer: string }[];
  availabilityNote?: string;
};

export function hindiGuide(
  title: string,
  description: string,
  intro: string,
  sections: [string, string, string][],
  faqs: [string, string][],
  availabilityNote?: string,
): HindiBlogContent {
  return {
    title, description, intro: [intro],
    sections: Object.fromEntries(sections.map(([id, heading, paragraph]) => [id, { heading, paragraphs: [paragraph] }])),
    faqs: faqs.map(([question, answer]) => ({ question, answer })),
    availabilityNote,
  };
}
