import './public-answers.css';

export type PublicAnswer = { question: string; answer: string };

// The same answers are present in the static HTML and remain visible after hydration.
export function PublicAnswers({ answers, idPrefix }: { answers: PublicAnswer[]; idPrefix: string }) {
  return <div className="rb-public-answers">{answers.map((item, index) => <article key={item.question} aria-labelledby={`${idPrefix}-${index + 1}`}>
    <h3 id={`${idPrefix}-${index + 1}`}>{item.question}</h3>
    <p>{item.answer}</p>
  </article>)}</div>;
}
