from scrappeycom.scrappey import Scrappey
import uuid
from bs4 import BeautifulSoup
from urllib.parse import urlencode

api_key = 'API_KEY'
scrappey_instance = Scrappey(api_key)

email = 'email'
password = 'password'
day = '01'
month = '01'
year = '2001'

try:
    sessionData = {
        'session': str(uuid.uuid4())
    }
    session = scrappey_instance.create_session(sessionData)
    print('Session created:', session['session'])

    get_request_result = scrappey_instance.get({
        'session': session['session'],
        'url': 'https://secure.runescape.com/m=account-creation/create_account?theme=oldschool',
    })

    print(get_request_result['solution']['response'])

    #Finding CSRF Token From The Get Request
    soup = BeautifulSoup(get_request_result['solution']['response'], 'html.parser')
    csrf_token_input = soup.find('input', {'name': 'csrf_token'})
    csrf_token_value = csrf_token_input['value']

    print(csrf_token_value)
    
    post_data = {
        "theme": "oldschool",
        "flow": "web",
        "email1": email,
        "onlyOneEmail": 1,
        "password1": password,
        "onlyOnePassword": 1,
        "day": day,
        "month": month,
        "year": year,
        "agree_terms": 1,
        "create-submit": "create",
        "csrf_token": csrf_token_value
    }

    post_request_result = scrappey_instance.post({
            'session': session['session'],
            "url": "https://secure.runescape.com/m=account-creation/create_account?theme=oldschool",
            "postData": urlencode(post_data)
            })
    
    print('POST Request Result:', post_request_result['solution']['response'])

except Exception as error:
    print(error)  
