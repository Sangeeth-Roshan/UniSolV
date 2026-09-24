import json
import random
import os

# Create the data directory if it doesn't exist
os.makedirs(os.path.join(os.path.dirname(__file__), '../data'), exist_ok=True)

DOMAINS = [
    "education", "healthcare", "agriculture", "water management",
    "sanitation", "environment", "rural livelihoods", "accessibility",
    "urban infrastructure", "public service delivery"
]

TEMPLATES = {
    "education": [
        ("School roof collapsing", "The primary school roof in our gaon is very dangerous. Bachhe log cannot sit inside when it rains. Please fix it immediately.", 0.8),
        ("No teachers in government school", "Master ji has not come to school for 3 weeks. Padhai puri rukk gayi hai. We complained to mukhiya but no action.", 0.7),
        ("Lack of drinking water in school", "There is no pani ki suvidha in the school. Children have to go to the nearby well during lunch. Very unsafe.", 0.6),
        ("Mid-day meal quality very bad", "The khana given in mid-day meal has insects. Children are falling sick after eating. Please check.", 0.8),
        ("School boundary wall broken", "Animals enter the school premises because the wall is toota hua. Very unsafe for students.", 0.6)
    ],
    "healthcare": [
        ("Primary Health Centre closed", "The local PHC is always locked. Doctor saab visits only once a month. Emergency patients face too much problem.", 0.9),
        ("No medicines at hospital", "Dawai nahi mil rahi sarkari hospital mein. They tell us to buy from private pharmacy. Poor people cannot afford this.", 0.8),
        ("Ambulance service not available", "When we called for ambulance, they said gaadi kharab hai. We had to hire a private auto for pregnant lady.", 0.85),
        ("Staff asking for bribe", "Nurses at the maternity ward are asking for paisa to show the baby. This is illegal.", 0.7),
        ("Hospital beds full of dogs", "Stray dogs are roaming inside the ward. Pura hospital ganda hai. No hygiene at all.", 0.85)
    ],
    "agriculture": [
        ("Irrigation canal broken", "The main nahar (canal) is broken since last monsoon. Khet sukh rahe hain, crop is dying. We need urgent repair.", 0.75),
        ("Fake fertilizers sold in market", "Some shops are selling nakli khad. Our entire paddy crop got destroyed. Requesting strict checking by agriculture officer.", 0.8),
        ("No MSP procurement", "Paddy procurement center is not opening. Middlemen are forcing us to sell at low price. Badi dikkat hai kisan ko.", 0.7),
        ("Elephants destroying crops", "Jangli haathi are entering our fields every night. All maize crops destroyed. Forest dept is not helping.", 0.9),
        ("Tractor subsidy denied", "I applied for the Krishi Yantra scheme but officer rejected without reason. Mazaak bana rakha hai.", 0.6)
    ],
    "water management": [
        ("Contaminated water from handpump", "Pani peela aur ganda aa raha hai. Many people in our ward are falling sick with diarrhea. Need immediate testing.", 0.95),
        ("Pipe leak wasting water", "There is a massive leak in the main supply line near the chowk. Thousands of liters wasting daily while our taps are dry.", 0.6),
        ("Pond encroachment", "Local mafia is filling up the talab (pond) to build houses. This will ruin our groundwater recharge.", 0.7),
        ("Water tanker not arriving", "The municipal water tanker hasn't come for 5 days. Pura mohalla is struggling for drinking water.", 0.8),
        ("Borewell dried up", "The public borewell has no water left. We have to walk 2 kms for paani.", 0.75)
    ],
    "sanitation": [
        ("Garbage not collected", "Kachra wali gaadi has not come for 10 days. The whole street is stinking. Bimari phailne ka darr hai.", 0.65),
        ("Public toilet blocked", "Sulabh shauchalaya is completely blocked and unusable. Women are facing the most difficulty. Please clean it.", 0.7),
        ("Drain overflowing on road", "Naali ka pani is flowing on the main road. It's very dirty and breeding mosquitoes. Walking is impossible.", 0.75),
        ("No dustbins in market", "Bazar mein koi kachra dabba nahi hai. Everyone throws plastic everywhere. Needs urgent cleaning.", 0.5),
        ("Dead animal on street", "A cow died on the main road 3 days ago. Smell is unbearable. Corporation is not lifting the body.", 0.85)
    ],
    "environment": [
        ("Illegal tree cutting", "Some people are cutting big trees in the forest at night. Jungle khatam ho raha hai. Forest guard is not listening.", 0.8),
        ("Coal dust pollution", "The nearby mining transport is causing too much dhool (dust). Children are coughing all the time. Need water sprinkling.", 0.85),
        ("Factory dumping chemical", "A factory is releasing chemical water into the local river. Machhali marr rahi hain (fishes are dying).", 0.9),
        ("Plastic burning", "People are burning plastic waste near the school. Saans lene mein takleef ho rahi hai.", 0.75),
        ("Stone crushing unit noise", "Illegal stone crusher running all night. It causes heavy noise and dust pollution in our residential area.", 0.8)
    ],
    "rural livelihoods": [
        ("MNREGA wages pending", "We worked for 14 days last month but paisa abhi tak account mein nahi aaya. How will we feed our families?", 0.8),
        ("Self Help Group loan issue", "Bank manager is asking for bribe to pass the loan for our Mahila Samiti. This is stopping our small business.", 0.7),
        ("No market shed for vendors", "Sabzi mandi has no roof. When it rains, our vegetables rot. We need a proper tin shed for the weekly haat.", 0.5),
        ("Handloom weavers not getting yarn", "Government supply of thread is stopped. Bunkar log unemployed baithe hain.", 0.65),
        ("Forest produce price very low", "Traders are buying Mahua at very cheap rates. Government should fix a minimum price for us.", 0.6)
    ],
    "accessibility": [
        ("No ramp at block office", "The block office only has stairs. Divyang (disabled) people like me cannot go inside to submit forms.", 0.7),
        ("Footpath broken", "The footpath near the market is completely broken with open manholes. Very dangerous for blind pedestrians.", 0.8),
        ("Wheelchair inaccessible buses", "None of the local city buses have low floors or ramps. Wheelchair users cannot travel at all.", 0.6),
        ("No sign language interpreter at hospital", "Deaf patients cannot explain their problems to doctors. Pura communication fail ho jata hai.", 0.75),
        ("Railway station lift not working", "Lift at platform 1 is out of order for a month. Elderly and disabled cannot climb the bridge.", 0.65)
    ],
    "urban infrastructure": [
        ("Street lights not working", "All street lights in sector 4 are bandh (off) for a month. Robberies have increased at night. Very unsafe.", 0.8),
        ("Potholes on main road", "Bade bade gadhe hain road par. Accidents happen daily, especially for two-wheelers. Urgent repair needed.", 0.75),
        ("Bridge construction stopped", "The contractor left the bridge work incomplete 2 years ago. Barsaat mein we have to travel 15km extra.", 0.65),
        ("Traffic signals dead", "Chowk pe traffic light kharab hai. Major traffic jam happens every evening. No police present.", 0.6),
        ("Park is poorly maintained", "The children's park is overgrown with weeds and swings are broken. Bachhe kahan khelenge?", 0.4)
    ],
    "public service delivery": [
        ("Ration card not issued", "I applied for ration card 6 months ago. Online status shows pending. Ghar mein khana nahi hai sir.", 0.85),
        ("Pension stopped", "My widow pension is not coming for the last 3 months. KYC is done but officer says wait. Please help.", 0.8),
        ("Aadhar center charging extra", "The local Aadhar update center is taking 200 rupees instead of 50. This is open loot of public.", 0.7),
        ("Caste certificate delay", "Block office is intentionally delaying my jati praman patra. I will miss my college admission.", 0.75),
        ("No response on helpline", "The CM public grievance number is always busy or rings out. Koi uthata hi nahi.", 0.6)
    ]
}

def generate_water_cluster(n=10):
    tickets = []
    # Hotspot for water outbreak in Jharkhand
    base_lat, base_lon = 24.0, 85.0
    for i in range(n):
        lat = base_lat + random.uniform(-0.02, 0.02)
        lon = base_lon + random.uniform(-0.02, 0.02)
        tickets.append({
            "title": f"Severe stomach pain from drinking water - Patient {i+1}",
            "description": "Family members are vomiting and having loose motion. The handpump water is looking muddy. Handpump ka paani peene se sab beemar ho rahe hain. Urgently send doctors.",
            "domain": "water management",
            "severity_score": 0.95,
            "rationale": "High severity due to immediate health risk and potential disease outbreak cluster.",
            "location": {"lat": round(lat, 5), "long": round(lon, 5)}
        })
    return tickets

def generate_random_location():
    # Bounding box for Jharkhand: roughly 21.9-25.3 N, 83.3-87.9 E
    LAT_MIN, LAT_MAX = 21.9, 25.3
    LON_MIN, LON_MAX = 83.3, 87.9
    
    # 50% chance to be near a major city hotspot
    hotspots = [
        (23.3441, 85.3096), # Ranchi
        (22.8046, 86.2029), # Jamshedpur
        (23.7957, 86.4304), # Dhanbad
        (24.2683, 87.2484)  # Dumka
    ]
    if random.random() < 0.5:
        base_lat, base_lon = random.choice(hotspots)
        return {
            "lat": round(base_lat + random.uniform(-0.05, 0.05), 5),
            "long": round(base_lon + random.uniform(-0.05, 0.05), 5)
        }
    else:
        return {
            "lat": round(random.uniform(LAT_MIN, LAT_MAX), 5),
            "long": round(random.uniform(LON_MIN, LON_MAX), 5)
        }

def main():
    dataset = []
    random.seed(42) # For reproducible results
    
    # 1. Add geographically clustered water outbreak tickets
    cluster_tickets = generate_water_cluster(10)
    dataset.extend(cluster_tickets)
    
    # 2. Add random tickets from templates until we reach 150
    counts = {domain: 0 for domain in DOMAINS}
    
    while len(dataset) < 150:
        # Distribute somewhat evenly
        domain_candidates = [d for d in DOMAINS if counts[d] < 15]
        if not domain_candidates:
            domain_candidates = DOMAINS
            
        domain = random.choice(domain_candidates)
        template = random.choice(TEMPLATES[domain])
        
        title, desc, severity = template
        counts[domain] += 1
        
        # Add random variations to severity and title to make them look distinct
        sev_variance = random.uniform(-0.05, 0.05)
        final_sev = max(0.0, min(1.0, severity + sev_variance))
        
        rationale = f"Based on issue type."
        if final_sev >= 0.8:
            rationale += " High priority due to significant impact on health or safety."
        elif final_sev >= 0.6:
            rationale += " Medium priority, causes significant community inconvenience."
        else:
            rationale += " Lower priority, localized issue."
            
        title_with_var = f"{title} (Report #{random.randint(100, 999)})"
            
        dataset.append({
            "title": title_with_var,
            "description": desc,
            "domain": domain,
            "severity_score": round(final_sev, 2),
            "rationale": rationale,
            "location": generate_random_location()
        })
        
    random.shuffle(dataset)
    
    output_file = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/synthetic_tickets.json'))
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully generated {len(dataset)} synthetic tickets at {output_file}")

if __name__ == '__main__':
    main()
