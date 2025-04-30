import { storeOrUpdateQuestion } from './storeQuestion';
import { getTopFAQs } from './GetFAQS';
import { createIndex } from './CreateIndex';

// Initialize the system by ensuring the index exists
export async function initFAQSystem(): Promise<void> {
  try {
    await createIndex();
  } catch (err) {
    console.error('Failed to initialize FAQ system:', err);
    throw err;
  }
}

// Handle incoming user input and update the question log
export async function handleUserInput(question: string): Promise<{ success: boolean; message: string }> {
  if (!question || question.trim() === '') {
    return { success: false, message: 'Invalid or empty question.' };
  }

  try {
    await storeOrUpdateQuestion(question);
    return { success: true, message: 'Question stored successfully.' };
  } catch (err) {
    console.error('Failed to store question:', err);
    return { success: false, message: 'Error storing question.' };
  }
}

// Fetch the top 5 most frequently asked questions
export async function fetchFAQs(): Promise<{ success: boolean; faqs?: string[]; message?: string }> {
  try {
    const faqs = await getTopFAQs();
    return { success: true, faqs };
  } catch (err) {
    console.error('Failed to fetch FAQs:', err);
    return { success: false, message: 'Error fetching FAQs.' };
  }
}
