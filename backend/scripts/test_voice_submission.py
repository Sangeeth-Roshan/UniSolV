import requests
from gtts import gTTS

def run_test():
    print("Generating Hindi audio...")
    text_hindi = "स्कूल के पास पानी का पाइप टूट गया है और सड़क पर पानी भर गया है।"
    tts = gTTS(text_hindi, lang='hi')
    tts.save("test_hindi.mp3")

    print("Submitting to backend...")
    with open("test_hindi.mp3", "rb") as f:
        files = {'audio': ("test_hindi.mp3", f, "audio/mp3")}
        data = {
            'reporter_id': '1',
            'title': 'Broken Water Pipe',
            'description': 'It is a big problem.',
            'public_good_consent': 'true',
            'lat': '23.3441',
            'lng': '85.3096'
        }
        resp = requests.post("http://localhost:8000/api/tickets", data=data, files=files)
        print("Status Code:", resp.status_code)
        print("Response:", resp.text)

if __name__ == "__main__":
    run_test()
