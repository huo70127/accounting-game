import {question as originalQuestion} from './questions-v2.js';
import {courseQuestion} from './course.js';
export {challenge,LESSON_VERSION,MAIN_QUESTIONS,CHALLENGE_IDS} from './questions-v2.js';
export const question=s=>courseQuestion(s)||originalQuestion(s);
