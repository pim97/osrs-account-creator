import Scrappey from "scrappey-wrapper";
import qs from "qs";

/**
 * Get your API key on Scrappey.com
 */
const scrappey = new Scrappey("API_KEY_HERE");

/**
 * Fill the details to register with on OSRS
 */
const EMAIL = 'test@email.com'
const PASSWORD = 'password_account'
const DAY = '01'
const MONTH = '01'
const YEAR = '1980'

/**
 * This will only send the GET request, get the CSRF and then send the POST request
 * All captcha's are solved automatically including Incapsula anti-bot and turnstile using Scrappey.
 */
async function run() {

    const createSession = await scrappey.createSession({
        // "proxy": "http://username:password@ip:port"
    })

    const session = createSession.session

    console.log(`Found session ${session}`)

    const get = await scrappey.get({
        session: session,
        url: 'https://secure.runescape.com/m=account-creation/create_account?theme=oldschool'
    })

    const csrf = get.solution.response.match(new RegExp(`<input type="hidden" name="csrf_token" value="(.*)" data-test="csrf-token">`))[1]

    const postData = {
        theme: "oldschool",
        flow: "web",
        email1: EMAIL,
        onlyOneEmail: 1,
        password1: PASSWORD,
        onlyOnePassword: 1,
        day: DAY,
        month: MONTH,
        year: YEAR,
        agree_terms: 1,
        "create-submit": "create",
        csrf_token: csrf
    };

    const post = await scrappey.post({
        session: session,
        url: 'https://secure.runescape.com/m=account-creation/create_account',
        postData: qs.stringify(postData),
    })

    console.log(post.solution.innerText)
    console.log(post.solution.title)

    await scrappey.destroySession(session)
}

run().then(() => {})