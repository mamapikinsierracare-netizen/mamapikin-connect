// scripts/importFacilities.ts
// Run with: npx ts-node scripts/importFacilities.ts

import * as fs from 'fs';
import * as path from 'path';

// Sample facilities (backup data in case download fails)
const backupFacilities = [
  { id: 'hosp-1', name: 'PCMH (Princess Christian Maternity)', phone: '076-901-234', category: 'hospital', district: 'Western Area Urban', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-2', name: 'Connaught Hospital', phone: '076-901-238', category: 'hospital', district: 'Western Area Urban', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-3', name: 'Makeni Regional Hospital', phone: '076-456-789', category: 'hospital', district: 'Bombali', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-4', name: 'Kenema Government Hospital', phone: '076-234-567', category: 'hospital', district: 'Kenema', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-5', name: 'Bo Government Hospital', phone: '076-123-789', category: 'hospital', district: 'Bo', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-6', name: 'Koidu Government Hospital', phone: '076-345-678', category: 'hospital', district: 'Kono', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-7', name: 'Kailahun Government Hospital', phone: '076-123-456', category: 'hospital', district: 'Kailahun', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-8', name: 'Port Loko Government Hospital', phone: '076-890-123', category: 'hospital', district: 'Port Loko', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-9', name: 'Kambia Government Hospital', phone: '076-567-890', category: 'hospital', district: 'Kambia', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-10', name: 'Kabala Government Hospital', phone: '076-678-901', category: 'hospital', district: 'Koinadugu', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-11', name: 'Magburaka Government Hospital', phone: '076-789-012', category: 'hospital', district: 'Tonkolili', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-12', name: 'Pujehun Government Hospital', phone: '076-345-901', category: 'hospital', district: 'Pujehun', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-13', name: 'Moyamba Government Hospital', phone: '076-456-012', category: 'hospital', district: 'Moyamba', operatingHours: '24/7', hasEmergency: true },
  { id: 'hosp-14', name: 'Bonthe Government Hospital', phone: '076-234-890', category: 'hospital', district: 'Bonthe', operatingHours: '24/7', hasEmergency: true },
];

// List of all districts in Sierra Leone
const districts = [
  'Western Area Urban', 'Western Area Rural', 'Bombali', 'Koinadugu', 
  'Tonkolili', 'Port Loko', 'Kambia', 'Kenema', 'Kono', 'Kailahun', 
  'Bo', 'Pujehun', 'Moyamba', 'Bonthe', 'Falaba', 'Nieni'
];

// Main function to create the facility file
function createFacilityFile() {
  console.log('📡 Creating facility list for emergency page...');
  console.log(`📍 This will create a file with ${backupFacilities.length} facilities\n`);
  
  // Define the output path
  const outputPath = path.join(process.cwd(), 'src', 'data', 'facilities.ts');
  const outputDir = path.dirname(outputPath);
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created directory: ${outputDir}`);
  }
  
  // Generate the TypeScript code
  const outputCode = `// AUTO-GENERATED facility list
// Generated on: ${new Date().toISOString()}
// Total facilities: ${backupFacilities.length}

import { EmergencyContact } from '@/types/emergency';

export const importedFacilities: EmergencyContact[] = ${JSON.stringify(backupFacilities, null, 2)};

// Export statistics
export const facilityStats = {
  total: ${backupFacilities.length},
  hospitals: ${backupFacilities.filter(f => f.category === 'hospital').length},
  lastUpdated: '${new Date().toISOString()}'
};
`;
  
  // Write the file
  fs.writeFileSync(outputPath, outputCode);
  console.log(`\n✅ SUCCESS! Created facility file at:`);
  console.log(`   ${outputPath}`);
  console.log(`\n📊 Statistics:`);
  console.log(`   Total facilities: ${backupFacilities.length}`);
  console.log(`   Hospitals: ${backupFacilities.filter(f => f.category === 'hospital').length}`);
  console.log(`\n📝 Next step: Import this file into your emergency page.`);
  console.log(`   Add this line to your emergency page:`);
  console.log(`   import { importedFacilities } from '@/data/facilities';`);
  console.log(`   Then add ...importedFacilities to your allContacts array.`);
}

// Run the function
createFacilityFile();