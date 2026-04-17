// src/app/guides/page.tsx
'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'

type Guide = {
  id: string
  category: string
  title: string
  description: string
  content: string
  applicableTo: string[]
}

const guides: Guide[] = [
  // ============================================================
  // ORIGINAL GUIDES (KEPT AS IS)
  // ============================================================
  { id: '1', category: 'Danger Signs', title: 'Severe Headache', description: 'A severe headache that won\'t go away could be a sign of pre-eclampsia', content: 'Do NOT take any medication without consulting a doctor. Go to your nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'] },
  { id: '2', category: 'Danger Signs', title: 'Blurred Vision', description: 'Blurred vision or seeing spots/flashes of light is a sign of severe pre-eclampsia', content: 'Do NOT drive. Go to your nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'] },
  { id: '3', category: 'Danger Signs', title: 'Swelling of Hands and Face', description: 'Sudden swelling could be a sign of pre-eclampsia', content: 'Remove tight jewelry. Go to nearest health facility IMMEDIATELY.', applicableTo: ['pregnant'] },
  { id: '4', category: 'Danger Signs', title: 'Fever', description: 'A fever during pregnancy could mean you have an infection', content: 'Drink plenty of water. Go to nearest health facility TODAY.', applicableTo: ['pregnant', 'child'] },
  { id: '5', category: 'Breastfeeding', title: 'How to Breastfeed', description: 'Step-by-step guide to proper latching', content: 'Hold baby close. Touch baby\'s lips with nipple. Baby opens mouth wide, latch on. Baby\'s chin touches breast, nose free.', applicableTo: ['breastfeeding'] },
  { id: '6', category: 'Breastfeeding', title: 'How to Increase Breast Milk', description: 'Tips for increasing milk supply', content: 'Breastfeed frequently (every 2-3 hours). Drink plenty of fluids. Eat well. Rest. Avoid stress.', applicableTo: ['breastfeeding'] },
  { id: '7', category: 'Nutrition', title: 'Foods to Eat During Pregnancy', description: 'Iron-rich and protein-rich foods', content: 'Iron-rich: beans, spinach, lean meat. Protein: fish, eggs, poultry. Fruits and vegetables. Drink plenty of water.', applicableTo: ['pregnant'] },
  { id: '8', category: 'Nutrition', title: 'Foods to Avoid During Pregnancy', description: 'Foods that may harm you or your baby', content: 'Avoid raw meat, unpasteurised milk, raw eggs, liver, alcohol, and excessive caffeine.', applicableTo: ['pregnant'] },
  { id: '9', category: 'Newborn Care', title: 'How to Bathe a Newborn', description: 'Step-by-step bathing guide', content: 'Use warm water. Support head. Wash gently. Keep cord dry and clean. No soap on face. Pat dry, dress warmly.', applicableTo: ['child'] },
  { id: '10', category: 'Newborn Care', title: 'Umbilical Cord Care', description: 'How to care for the umbilical cord stump', content: 'Keep cord clean and dry. Do not apply anything. If red, smelly, or oozing, see clinic.', applicableTo: ['child'] },

  // ============================================================
  // ADDITIONAL DANGER SIGNS GUIDES (5 NEW)
  // ============================================================
  { id: 'ds6', category: 'Danger Signs', title: 'Vaginal Bleeding', description: 'Any bleeding during pregnancy is not normal and requires immediate care', content: 'Do not insert anything into the vagina. Do not have sex. Go to the nearest health facility IMMEDIATELY. Do not wait.', applicableTo: ['pregnant'] },
  { id: 'ds7', category: 'Danger Signs', title: 'Convulsions (Fits)', description: 'Shaking or jerking movements that you cannot control – this is a medical emergency', content: 'Place the person on their side. Clear the area of objects. Do NOT put anything in their mouth. Time the seizure. Call an ambulance immediately (999).', applicableTo: ['pregnant', 'child'] },
  { id: 'ds8', category: 'Danger Signs', title: 'Difficulty Breathing', description: 'Trouble breathing or feeling like you cannot get enough air', content: 'Sit upright. Loosen tight clothing. Do not lie down. Go to the nearest health facility IMMEDIATELY. Call an ambulance if available.', applicableTo: ['pregnant', 'breastfeeding', 'child'] },
  { id: 'ds9', category: 'Danger Signs', title: 'Severe Abdominal Pain', description: 'Very strong stomach pain that does not go away', content: 'Do not eat or drink. Do not take painkillers. Go to the nearest health facility IMMEDIATELY. This could be a sign of placental abruption or appendicitis.', applicableTo: ['pregnant'] },
  { id: 'ds10', category: 'Danger Signs', title: 'Foul-Smelling Vaginal Discharge', description: 'Bad-smelling discharge or discharge that looks unusual', content: 'This could be a sign of infection. Do not douche. Go to the health facility TODAY. Infection can lead to preterm labor.', applicableTo: ['pregnant'] },

  // ============================================================
  // ADDITIONAL BREASTFEEDING GUIDES (5 NEW)
  // ============================================================
  { id: 'bf4', category: 'Breastfeeding', title: 'Breastfeeding Positions', description: 'Different ways to hold your baby while breastfeeding', content: 'Cradle hold: baby’s head in the crook of your arm. Football hold: baby tucked under your arm like a football. Side‑lying: both you and baby lie on your sides facing each other. Choose what is comfortable for you and baby.', applicableTo: ['breastfeeding'] },
  { id: 'bf5', category: 'Breastfeeding', title: 'Signs of a Good Latch', description: 'How to know if baby is latching correctly', content: 'Baby’s mouth covers most of the areola. Lips are flanged outward (like a fish). You hear swallowing, not clicking. Feeding does not hurt. Baby is content after feeding.', applicableTo: ['breastfeeding'] },
  { id: 'bf6', category: 'Breastfeeding', title: 'Treating Cracked Nipples', description: 'How to care for sore or cracked nipples', content: 'Express a few drops of breastmilk and rub it on the nipple after feeding. Let nipples air dry. Use a lanolin cream if available. Change nursing pads frequently. If pain continues, see a nurse.', applicableTo: ['breastfeeding'] },
  { id: 'bf7', category: 'Breastfeeding', title: 'Breastfeeding and Medicines', description: 'Which medicines are safe while breastfeeding', content: 'Most common medicines are safe. Avoid: ergotamine, lithium, some cancer drugs, radioactive drugs. Always tell your nurse that you are breastfeeding before taking any medicine.', applicableTo: ['breastfeeding'] },
  { id: 'bf8', category: 'Breastfeeding', title: 'Breastfeeding and Diet', description: 'What to eat and drink while breastfeeding', content: 'Eat a balanced diet with extra protein (fish, eggs, beans). Drink plenty of water (at least 8 glasses per day). Avoid too much caffeine. Alcohol can pass to your baby – best to avoid.', applicableTo: ['breastfeeding'] },

  // ============================================================
  // ADDITIONAL NUTRITION GUIDES (5 NEW)
  // ============================================================
  { id: 'n4', category: 'Nutrition', title: 'Iron‑Rich Foods for Anaemia', description: 'Foods that help prevent and treat anaemia', content: 'Eat: dark green leafy vegetables (spinach, kale), beans, lentils, lean red meat, chicken, fish, eggs, fortified cereals. Take your iron tablets daily. Vitamin C (oranges, tomatoes) helps your body absorb iron.', applicableTo: ['pregnant', 'breastfeeding', 'child'] },
  { id: 'n5', category: 'Nutrition', title: 'Healthy Snacks for Pregnancy', description: 'Nutritious snacks to eat between meals', content: 'Fruit (banana, orange, mango). Yogurt. Nuts (groundnuts, cashews). Whole grain bread with egg or avocado. Boiled sweet potato. Avoid sugary snacks and sodas.', applicableTo: ['pregnant'] },
  { id: 'n6', category: 'Nutrition', title: 'Feeding Your Baby (0‑6 months)', description: 'Exclusive breastfeeding is best for the first 6 months', content: 'Breastfeed whenever baby is hungry (on demand). No water, no other milk, no solid food. Breastmilk gives all the nutrients and water your baby needs. Breastfeed at least 8‑12 times per day.', applicableTo: ['child'] },
  { id: 'n7', category: 'Nutrition', title: 'Feeding Your Baby (6‑12 months)', description: 'Introducing solid foods while continuing breastfeeding', content: 'Start with soft, mashed foods: porridge, mashed banana, mashed sweet potato. Add one new food every few days to watch for allergies. Continue breastfeeding. Give iron‑rich foods (meat, beans, egg yolk).', applicableTo: ['child'] },
  { id: 'n8', category: 'Nutrition', title: 'Preventing Malnutrition in Children', description: 'How to make sure your child grows healthy and strong', content: 'Breastfeed exclusively for 6 months. Continue breastfeeding for up to 2 years. Give a variety of foods: grains, legumes, vegetables, fruits, eggs, meat. Monitor MUAC (arm circumference) at clinic visits.', applicableTo: ['child'] },

  // ============================================================
  // ADDITIONAL NEWBORN CARE GUIDES (4 NEW)
  // ============================================================
  { id: 'nb4', category: 'Newborn Care', title: 'Jaundice in Newborns', description: 'Yellow colour of the skin and eyes', content: 'Mild jaundice is common and usually goes away on its own. If jaundice spreads to the feet, or baby is very sleepy, not feeding well, or has dark urine, see a nurse immediately. Treatment: more frequent feeding or phototherapy.', applicableTo: ['child'] },
  { id: 'nb5', category: 'Newborn Care', title: 'When to Call a Doctor for Your Baby', description: 'Danger signs in a newborn', content: 'Call a doctor if: baby has fever (>38°C) or feels cold, is not feeding, has fast or difficult breathing, has convulsions, is very sleepy and hard to wake, has yellow skin that spreads to feet, has a bulging soft spot on the head.', applicableTo: ['child'] },
  { id: 'nb6', category: 'Newborn Care', title: 'Circumcision Care', description: 'How to care for the penis after circumcision', content: 'Keep the area clean. Apply petroleum jelly with each diaper change. Expect some swelling and a yellowish coating – this is normal healing. Call a doctor if there is heavy bleeding, foul smell, or fever.', applicableTo: ['child'] },
  { id: 'nb7', category: 'Newborn Care', title: 'Thrush (Oral Candidiasis)', description: 'White patches in the baby’s mouth that do not wipe off', content: 'Thrush is caused by yeast. It can make feeding painful. See a nurse for antifungal medicine. Wash bottle nipples and pacifiers in hot water. If you are breastfeeding, you may need treatment too.', applicableTo: ['child', 'breastfeeding'] },

  // ============================================================
  // COMMON CHILDHOOD AILMENTS (5 NEW)
  // ============================================================
  { id: 'ca1', category: 'Common Ailments', title: 'Diarrhoea in Children', description: 'Frequent, watery stools', content: 'Give Oral Rehydration Solution (ORS) immediately. Continue breastfeeding or feeding. Do not give anti‑diarrhoea medicine unless prescribed. Seek care if: diarrhoea with blood, not able to drink, sunken eyes, very dry mouth, no urine for 6 hours.', applicableTo: ['child'] },
  { id: 'ca2', category: 'Common Ailments', title: 'Vomiting in Children', description: 'Throwing up repeatedly', content: 'Do not give anything by mouth for 30 minutes. Then give small sips of ORS every 10 minutes. If vomiting continues, seek care immediately. Danger signs: vomiting everything, cannot keep any fluid down, signs of dehydration.', applicableTo: ['child'] },
  { id: 'ca3', category: 'Common Ailments', title: 'Fever in Children', description: 'Temperature above 38°C', content: 'Give paracetamol (by weight). Remove extra clothing. Sponge with lukewarm water. Do not use cold water or alcohol. Seek care if: fever >39°C, child is lethargic, not drinking, has convulsions, or fever lasts >3 days.', applicableTo: ['child'] },
  { id: 'ca4', category: 'Common Ailments', title: 'Cough and Cold', description: 'Runny nose, cough, sometimes fever', content: 'Most coughs and colds are caused by viruses and do not need antibiotics. Give plenty of fluids. Use honey for children over 1 year (1 teaspoon). Do not give cough syrup to children under 2 years. Seek care if: fast breathing, chest indrawing, unable to drink.', applicableTo: ['child'] },
  { id: 'ca5', category: 'Common Ailments', title: 'Malaria in Children', description: 'Fever, chills, headache, vomiting', content: 'If your child has fever, get tested for malaria (RDT). If positive, take the full course of antimalarial medicine as prescribed. Do not stop early. Give paracetamol for fever. Use mosquito nets every night.', applicableTo: ['child', 'pregnant'] },

  // ============================================================
  // PREGNANCY & POSTNATAL (5 NEW)
  // ============================================================
  { id: 'pg1', category: 'Pregnancy', title: 'Danger Signs in Pregnancy (Full List)', description: 'All danger signs you should never ignore', content: 'Severe headache, blurred vision, swelling, fever, severe abdominal pain, reduced fetal movement, vaginal bleeding, leaking fluid, convulsions, difficulty breathing. If you have ANY of these, go to a health facility immediately.', applicableTo: ['pregnant'] },
  { id: 'pg2', category: 'Pregnancy', title: 'What to Take to the Hospital for Delivery', description: 'Packing list for labour and delivery', content: 'Birth plan, patient ID card, phone and charger, clothes for you and baby (2‑3 sets), sanitary pads, toiletries, snacks and drinks, baby blanket, nappies (cloth or disposable), mosquito net.', applicableTo: ['pregnant'] },
  { id: 'pg3', category: 'Pregnancy', title: 'Signs of Labour', description: 'How to know when you are truly in labour', content: 'Regular contractions that get stronger and closer together. Water breaking (fluid leaking from vagina). Bloody show (mucus with blood). Back pain that does not go away. If you are unsure, go to the health facility to be checked.', applicableTo: ['pregnant'] },
  { id: 'pg4', category: 'Pregnancy', title: 'Preterm Labour Warning Signs', description: 'Signs that labour may be starting too early (<37 weeks)', content: 'Contractions every 10 minutes or more often. Leaking fluid. Pelvic pressure (feeling like baby is pushing down). Low, dull backache. Cramps like period. If you have any of these before 37 weeks, go to a hospital immediately.', applicableTo: ['pregnant'] },
  { id: 'pg5', category: 'Pregnancy', title: 'Gestational Diabetes', description: 'High blood sugar during pregnancy', content: 'Risk factors: overweight, family history of diabetes, previous large baby, age >35. You may need to test your blood sugar. Treatment: healthy diet, exercise, sometimes insulin. Uncontrolled diabetes can cause a large baby and delivery problems.', applicableTo: ['pregnant'] },

  // ============================================================
  // HYGIENE & PREVENTION (4 NEW)
  // ============================================================
  { id: 'hy1', category: 'Hygiene', title: 'Handwashing with Soap', description: 'When and how to wash hands properly', content: 'Wash hands: before eating, before preparing food, after using the toilet, after changing baby’s nappy, after touching a sick person. Use soap and clean water. Scrub all surfaces for 20 seconds (sing “Happy Birthday” twice). Dry with a clean cloth.', applicableTo: ['all'] },
  { id: 'hy2', category: 'Hygiene', title: 'Menstrual Hygiene', description: 'How to manage your period safely and with dignity', content: 'Use clean pads or cloth. Change every 4‑6 hours. Wash reusable cloth with soap and dry in the sun. Wash your hands before and after changing. Do not flush pads down the toilet. If you have pain or heavy bleeding, see a nurse.', applicableTo: ['all'] },
  { id: 'hy3', category: 'Hygiene', title: 'Preventing Malaria', description: 'How to protect yourself and your family from malaria', content: 'Sleep under a mosquito net every night (treated nets are best). Clear standing water around your home where mosquitoes breed. Use mosquito repellent if available. Pregnant women should take IPTp (malaria prevention medicine) at ANC visits.', applicableTo: ['all'] },
  { id: 'hy4', category: 'Hygiene', title: 'Safe Water Storage', description: 'How to keep drinking water clean', content: 'Store water in a clean container with a tight lid. Use a clean cup to take water out – do not dip your hands or a dirty cup into the container. Treat water if needed: boil for 5 minutes, or add chlorine (WaterGuard).', applicableTo: ['all'] },

  // ============================================================
  // MEDICATION SAFETY (3 NEW)
  // ============================================================
  { id: 'ms1', category: 'Medication Safety', title: 'Safe Use of Paracetamol', description: 'How to give paracetamol safely to children and adults', content: 'Use the correct dose based on weight, not age. Give every 6‑8 hours. Do not exceed 4 doses in 24 hours. Overdose can harm the liver. Keep paracetamol out of reach of children.', applicableTo: ['all'] },
  { id: 'ms2', category: 'Medication Safety', title: 'Storing Medicines Safely', description: 'How to keep medicines effective and out of reach of children', content: 'Keep medicines in their original containers. Store in a cool, dry place (not in the bathroom or kitchen). Do not share prescription medicines. Dispose of expired medicines safely – do not flush or throw in open trash.', applicableTo: ['all'] },
  { id: 'ms3', category: 'Medication Safety', title: 'What to Do If You Miss a Dose', description: 'How to handle missed medication', content: 'If you miss a dose, take it as soon as you remember. If it is almost time for the next dose, skip the missed dose. Do not take a double dose. For antibiotics, try not to miss any doses – finish the full course.', applicableTo: ['all'] },

  // ============================================================
  // MENTAL HEALTH (3 NEW)
  // ============================================================
  { id: 'mh1', category: 'Mental Health', title: 'Feeling Overwhelmed?', description: 'It is normal to feel stressed, but you are not alone', content: 'Talk to someone you trust: partner, friend, nurse. Rest when the baby sleeps. Accept help from family. Do not try to do everything alone. If sad feelings last more than 2 weeks or you think about hurting yourself, tell a nurse immediately.', applicableTo: ['breastfeeding', 'pregnant'] },
  { id: 'mh2', category: 'Mental Health', title: 'Postpartum Depression Signs', description: 'Depression after having a baby', content: 'Feeling sad, hopeless, or empty most of the day. Loss of interest in things you used to enjoy. Trouble sleeping (even when baby sleeps). Crying a lot. Feeling guilty or worthless. Thoughts of harming yourself or the baby – seek help immediately.', applicableTo: ['breastfeeding'] },
  { id: 'mh3', category: 'Mental Health', title: 'Stress During Pregnancy', description: 'How to manage stress while pregnant', content: 'Talk to someone. Take gentle walks. Breathe deeply: inhale for 4 seconds, hold for 4, exhale for 4. Rest when you can. Do not take on too much. Avoid alcohol, drugs, or too much caffeine. Seek help if stress affects your daily life.', applicableTo: ['pregnant'] },

  // ============================================================
  // FAMILY PLANNING (3 NEW)
  // ============================================================
  { id: 'fp3', category: 'Family Planning', title: 'Contraceptive Implant', description: 'A small rod placed under the skin of the arm', content: 'Lasts 3‑5 years. Very effective (>99%). Does not affect breastfeeding. Can be removed at any time. Side effects: irregular bleeding, headaches, mood changes. Insertion and removal must be done by a trained nurse or doctor.', applicableTo: ['breastfeeding'] },
  { id: 'fp4', category: 'Family Planning', title: 'IUD (Intrauterine Device)', description: 'A small device placed inside the uterus', content: 'Lasts 5‑12 years. Very effective (>99%). Does not affect breastfeeding. Can be removed at any time. Side effects: heavier periods, cramping. Must be inserted and removed by a trained provider.', applicableTo: ['breastfeeding'] },
  { id: 'fp5', category: 'Family Planning', title: 'Emergency Contraception (Morning‑After Pill)', description: 'Prevents pregnancy after unprotected sex', content: 'Take as soon as possible, within 5 days (120 hours). The sooner you take it, the more effective it is. It is not for regular use. Does not protect against STIs. Available at health facilities.', applicableTo: ['breastfeeding'] },
]

const categories = ['All', 'Danger Signs', 'Breastfeeding', 'Nutrition', 'Newborn Care', 'Common Ailments', 'Pregnancy', 'Hygiene', 'Medication Safety', 'Mental Health', 'Family Planning']

export default function GuidesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)

  const filteredGuides = guides.filter(guide => {
    if (selectedCategory !== 'All' && guide.category !== selectedCategory) return false
    if (searchTerm && !guide.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-green-700">📚 Patient Education Guides</h1>
            <p className="text-gray-600">Health information you can trust – available offline</p>
          </div>

          {/* Search and Categories */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search guides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              />
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm ${selectedCategory === cat ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map(guide => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-gradient-to-r from-green-400 to-teal-400 flex items-center justify-center">
                  <span className="text-5xl">
                    {guide.category === 'Danger Signs' ? '⚠️' :
                     guide.category === 'Breastfeeding' ? '🤱' :
                     guide.category === 'Nutrition' ? '🍎' :
                     guide.category === 'Newborn Care' ? '🍼' :
                     guide.category === 'Common Ailments' ? '🤒' :
                     guide.category === 'Pregnancy' ? '🤰' :
                     guide.category === 'Hygiene' ? '🧼' :
                     guide.category === 'Medication Safety' ? '💊' :
                     guide.category === 'Mental Health' ? '🧠' :
                     guide.category === 'Family Planning' ? '👨‍👩‍👧' : '📖'}
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-xs text-green-600 mb-1">{guide.category}</div>
                  <h3 className="font-bold text-lg mb-2">{guide.title}</h3>
                  <p className="text-sm text-gray-600">{guide.description.substring(0, 100)}...</p>
                  <div className="mt-3 text-green-600 text-sm">Read more →</div>
                </div>
              </div>
            ))}
          </div>

          {filteredGuides.length === 0 && (
            <div className="text-center py-8 text-gray-500">No guides found.</div>
          )}
        </div>
      </div>

      {/* Guide Detail Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-sm text-green-600">{selectedGuide.category}</div>
                <h2 className="text-xl font-bold">{selectedGuide.title}</h2>
              </div>
              <button onClick={() => setSelectedGuide(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            
            <div className="bg-gradient-to-r from-green-400 to-teal-400 h-40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-6xl">
                {selectedGuide.category === 'Danger Signs' ? '⚠️' :
                 selectedGuide.category === 'Breastfeeding' ? '🤱' :
                 selectedGuide.category === 'Nutrition' ? '🍎' :
                 selectedGuide.category === 'Newborn Care' ? '🍼' :
                 selectedGuide.category === 'Common Ailments' ? '🤒' :
                 selectedGuide.category === 'Pregnancy' ? '🤰' :
                 selectedGuide.category === 'Hygiene' ? '🧼' :
                 selectedGuide.category === 'Medication Safety' ? '💊' :
                 selectedGuide.category === 'Mental Health' ? '🧠' :
                 selectedGuide.category === 'Family Planning' ? '👨‍👩‍👧' : '📖'}
              </span>
            </div>
            <p className="text-gray-700 mb-4">{selectedGuide.description}</p>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <p className="font-bold">What to do:</p>
              <p>{selectedGuide.content}</p>
            </div>
            <button
              onClick={() => {
                const printContent = `
                  <html><head><title>${selectedGuide.title}</title>
                  <style>body{font-family:Arial;padding:20px}</style></head>
                  <body><h1>${selectedGuide.title}</h1>
                  <p>${selectedGuide.description}</p>
                  <p><strong>What to do:</strong> ${selectedGuide.content}</p>
                  <hr><p>MamaPikin Connect - Protecting Mothers and Children in Sierra Leone</p>
                  </body></html>
                `
                const win = window.open('', '_blank')
                win?.document.write(printContent)
                win?.print()
              }}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🖨️ Print Guide
            </button>
          </div>
        </div>
      )}
    </>
  )
}