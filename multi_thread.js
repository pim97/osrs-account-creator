import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import Scrappey from "scrappey-wrapper";
import qs from "qs";
import { readFileSync, writeFileSync } from "fs";

const MIN_PASSWORD_LENGTH = 7;
const MAX_PASSWORD_LENGTH = 12;
const DAY = '01';
const MONTH = '01';
const YEAR = '2001';

const textFilePath = 'accounts.txt';
const emailsFilePath = 'emails.txt';

let emails = readFileSync(emailsFilePath, 'utf8').split('\n').map(email => email.trim());

function generateRandomPassword() {
    const length = Math.floor(Math.random() * (MAX_PASSWORD_LENGTH - MIN_PASSWORD_LENGTH + 1)) + MIN_PASSWORD_LENGTH;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }
    return password;
}

function writeToTextFile(data) {
    const textData = data.map(entry => `${entry.Email}:${entry.Password}`).join('\n');
    writeFileSync(textFilePath, textData + '\n', { flag: 'a', encoding: 'utf8' });
}

function removeUsedEmail(email) {
    emails = emails.filter(existingEmail => existingEmail !== email);
    writeFileSync(emailsFilePath, emails.join('\n'), 'utf8');
    console.log(`Removed email ${email} from ${emailsFilePath}`);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function runThread(emailsChunk) {
    return new Promise(async (resolve) => {
        for (const email of emailsChunk) {
            let retryCount = 0;
            let success = false;

            while (retryCount < 3 && !success) {
                try {
                    const scrappey = new Scrappey("API_KEY");
                    const password = generateRandomPassword();
                    const createSession = await scrappey.createSession({});
                    const session = createSession.session;

                    console.log(`Found session ${session} for email ${email}`);

                    const get = await scrappey.get({
                        session: session,
                        url: 'https://secure.runescape.com/m=account-creation/create_account?theme=oldschool'
                    });

                    console.log(`Sent GET`)

                    const csrf = get.solution.response.match(new RegExp(`<input type="hidden" name="csrf_token" value="(.*)" data-test="csrf-token">`))[1];

                    const postData = {
                        theme: "oldschool",
                        flow: "web",
                        email1: email,
                        onlyOneEmail: 1,
                        password1: password,
                        onlyOnePassword: 1,
                        day: DAY,
                        month: MONTH,
                        year: YEAR,
                        agree_terms: 1,
                        "create-submit": "create",
                        csrf_token: csrf
                    };

                    console.log(`Sending POST`)

                    const post = await scrappey.post({
                        session: session,
                        url: 'https://secure.runescape.com/m=account-creation/create_account',
                        postData: qs.stringify(postData),
                    });

                    console.log(`Sent POST`)

                    const postSolution = post.solution;

                    if (postSolution && postSolution.innerText && postSolution.innerText.includes("You can now begin your adventure with your new account")) {
                        // Account creation was successful
                        console.log(`Guthix provides! Account for email ${email} was created successfully.`);
                        const accountDetails = {
                            Email: email,
                            Password: password,
                        };
                        writeToTextFile([accountDetails]);
                        removeUsedEmail(email);
                        await scrappey.destroySession(session);
                        success = true;
                    } else if (postSolution && postSolution.innerText && postSolution.innerText.includes("Recover this account")) {
                        // Email has already been registered, skip and move on to the next email
                        console.error(`Email ${email} has already been registered. Skipping.`);
                        removeUsedEmail(email);
                        success = true;
                    } else {
                        // Account creation failed
                        console.error(`Account creation for email ${email} failed. Retrying...`);
                        retryCount += 1;
                        if (retryCount === 3) {
                            console.log(`Something went wrong with ${email}.`);
                        }
                    }
                } catch (error) {
                    console.error(error)
                    console.error(`Error for email ${email}:`, error.message);
                    retryCount += 1;
                    if (retryCount === 3) {
                        console.log(`General unknown error. Try checking your API token balance.`);
                    }
                }
            }

            if (!success) {
                console.error(`Failed to process email ${email} after 3 retries. Skipping.`);
            }
        }

        resolve();
    });
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
    const numThreads = 5;
    const chunkSize = Math.ceil(emails.length / numThreads);
    const workerPromises = [];

    if (isMainThread) {
        for (let i = 0; i < numThreads; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const emailsChunk = emails.slice(start, end);
            
            const worker = new Worker(__filename, {
                workerData: { emails: emailsChunk },
            });

            const workerPromise = new Promise((resolve) => {
                worker.on('exit', () => resolve());
            });

            workerPromises.push(workerPromise);
        }

        await Promise.all(workerPromises);
    } else {
        await runThread(workerData.emails);
    }
}

run().then(() => {});
