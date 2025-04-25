//testHandler.ts is not needed for actual use
import { initFAQSystem, handleUserInput, fetchFAQs } from './handler'


async function smokeTest() {
  await initFAQSystem();
  await handleUserInput('What is OpenSearch?');
  const result = await fetchFAQs();
  console.log('🌟 Top FAQs now:', result);
}
smokeTest();