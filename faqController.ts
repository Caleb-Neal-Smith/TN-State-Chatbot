import { fetchFAQs } from './handler';

export async function getFaqsResponse(): Promise<string[]> {
  const { success, faqs, message } = await fetchFAQs();
  if (!success) {
    console.error('Could not load FAQs:', message);
    throw new Error('FAQ service unavailable');
  }
  return faqs!;
}
