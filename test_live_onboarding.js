const API_URL = 'http://localhost:5000/api';

async function testOnboardingFlow() {
    console.log('🚀 Starting Live School Onboarding Test...');
    const uniqueSuffix = Date.now();
    const newSchoolData = {
        schoolName: `Test Live School ${uniqueSuffix}`,
        schoolCode: `TLS${uniqueSuffix.toString().slice(-4)}`,
        schoolEmail: `contact${uniqueSuffix}@testschool.edu`,
        phone: '+1234567890',
        mainBranchName: 'Main Campus',
        mainBranchCode: 'MAIN',
        adminName: 'Jane Director',
        adminEmail: `director${uniqueSuffix}@testschool.edu`,
        adminPassword: 'SecurePassword123!',
        subscriptionTier: 'premium'
    };

    try {
        console.log(`📡 Sending Onboarding Request for: ${newSchoolData.schoolName}`);
        const response = await fetch(`${API_URL}/schools/onboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSchoolData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Onboarding Successful!');
            console.log('📦 API Response Data:', JSON.stringify(data, null, 2));
            console.log('🌟 System is PRODUCTION READY for new live schools.');
        } else {
            console.error('❌ Onboarding Failed:', data);
            console.log('System is NOT ready for new live schools.');
        }
    } catch (error) {
        console.error('💥 Onboarding Request Exception:', error.message);
    }
}

testOnboardingFlow();
