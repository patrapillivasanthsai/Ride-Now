export type Language = 'en' | 'hi' | 'te';

export interface TranslationDict {
  [key: string]: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    // Brand & Tagline
    appName: 'RideNow Captain',
    tagline: 'Drive. Earn. Grow.',
    subtagline: 'Join RideNow and turn every journey into an opportunity.',
    
    // Login
    emailLabel: 'Email Address',
    emailPlaceholder: 'captain@gmail.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    continueBtn: 'Continue',
    forgotPassword: 'Forgot Password?',
    newToRideNow: 'New to RideNow?',
    registerAsCaptain: 'Register as a Captain',
    loggingIn: 'Signing in...',
    invalidCredentials: 'Invalid email or password. Please try again.',
    showPassword: 'Show',
    hidePassword: 'Hide',

    // Registration Steps
    step1Title: 'Become a RideNow Captain',
    step1Sub: "Let's get you ready to start earning.",
    step2Title: 'Choose your vehicle',
    step2Sub: 'Select the vehicle you will use for RideNow trips.',
    step3Title: 'Complete your profile',
    step3Sub: 'Help us verify your identity.',
    step4Title: 'Verify your documents',
    step4Sub: 'Complete your verification to activate your Captain account.',
    step5Title: 'Set up your payouts',
    step5Sub: 'Add your preferred payout method to receive your earnings.',
    
    // Step 1 Details
    fullName: 'Full Name',
    mobileNumber: 'Mobile Number',
    dob: 'Date of Birth',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    legalNotice: 'Please enter your details exactly as they appear on your legal documents.',
    
    // Step 2 Vehicle
    bikeTitle: 'Bike',
    bikeCategory: 'Two-Wheeler',
    autoTitle: 'Auto',
    autoCategory: 'Three-Wheeler',
    cabTitle: 'Cab',
    cabCategory: 'Four-Wheeler',
    vehicleMake: 'Make / Brand',
    vehicleModel: 'Model',
    vehicleYear: 'Registration Year',
    plateNumber: 'License Plate Number',
    
    // Step 3 Selfie
    takeSelfie: 'Take a clear selfie',
    takeSelfieBtn: 'Take Selfie',
    useDefaultAvatar: 'Use Default Profile Avatar',
    guideline1: '• Make sure your face is clearly visible.',
    guideline2: '• Remove sunglasses, caps and masks.',
    guideline3: '• Use good lighting.',
    
    // Step 4 Documents
    idDocs: 'IDENTITY DOCUMENTS',
    vehicleDocs: 'VEHICLE DOCUMENTS',
    drivingLicence: 'Driving Licence',
    aadhaarCard: 'Aadhaar Card',
    panCard: 'PAN Card',
    rcDoc: 'Vehicle Registration Certificate',
    insuranceDoc: 'Vehicle Insurance',
    permitDoc: 'Permit (Commercial Vehicle)',
    notStarted: 'Not Started',
    uploaded: 'Uploaded',
    underReview: 'Under Review',
    verified: 'Verified',
    rejected: 'Rejected',
    
    // Step 5 Payout
    bankAccount: 'Bank Account',
    upiId: 'UPI ID',
    accountHolderName: 'Account Holder Name',
    bankName: 'Bank Name',
    accountNumber: 'Account Number',
    confirmAccountNumber: 'Confirm Account Number',
    ifscCode: 'IFSC Code',
    verifyAndContinue: 'Complete Registration',
    secureNotice: '🔒 Your payout information is securely protected.',

    // Pending Review
    accountUnderReview: 'Your account is under review',
    underReviewSub: "We're reviewing your profile, documents and verification details. You'll be notified when your Captain account is ready.",
    profileCompleted: 'Profile completed',
    documentsSubmitted: 'Documents submitted',
    payoutAdded: 'Payout details added',
    verificationInProgress: 'Verification in progress',
    startTrainingPrompt: 'While you wait, complete your Captain safety training.',
    startTrainingBtn: 'Start Training',
    checkStatusBtn: '🔄 Check Approval Status',

    // Dashboard
    offline: 'OFFLINE',
    online: 'ONLINE',
    offlineDesc: 'Go online to start receiving ride requests.',
    onlineDesc: 'Ready to receive ride requests',
    goToArea: 'Go To Area',
    todaysEarnings: "TODAY'S EARNINGS",
    completedTrips: 'COMPLETED TRIPS',
    onlineTime: 'ONLINE TIME',
    acceptRide: 'Accept Ride ⚡',
    decline: 'Decline',

    // Navigation Tabs
    tripsTab: 'Trips',
    earningsTab: 'Earnings',
    walletTab: 'Wallet',
    referTab: 'Refer',
    profileTab: 'Profile',
  },
  hi: {
    // Brand & Tagline
    appName: 'राइडनाउ कैप्टन',
    tagline: 'गाड़ी चलाएं. कमाएं. आगे बढ़ें.',
    subtagline: 'राइडनाउ से जुड़ें और हर यात्रा को कमाई का अवसर बनाएं।',
    
    // Login
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'captain@gmail.com',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    continueBtn: 'आगे बढ़ें',
    forgotPassword: 'पासवर्ड भूल गए?',
    newToRideNow: 'राइडनाउ में नए हैं?',
    registerAsCaptain: 'कैप्टन के रूप में पंजीकरण करें',
    loggingIn: 'साइन इन हो रहा है...',
    invalidCredentials: 'अमान्य ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।',
    showPassword: 'दिखाएं',
    hidePassword: 'छिपाएं',

    // Registration Steps
    step1Title: 'राइडनाउ कैप्टन बनें',
    step1Sub: 'कमाई शुरू करने के लिए अपनी जानकारी भरें।',
    step2Title: 'अपना वाहन चुनें',
    step2Sub: 'राइडनाउ ट्रिप के लिए उपयोग किए जाने वाले वाहन का चयन करें।',
    step3Title: 'अपनी प्रोफ़ाइल पूरी करें',
    step3Sub: 'पहचान सत्यापन में हमारी सहायता करें।',
    step4Title: 'अपने दस्तावेज़ सत्यापित करें',
    step4Sub: 'कैप्टन खाता सक्रिय करने के लिए सत्यापन पूरा करें।',
    step5Title: 'भुगतान विवरण सेट करें',
    step5Sub: 'कमाई प्राप्त करने के लिए अपनी पसंदीदा भुगतान विधि जोड़ें।',
    
    // Step 1 Details
    fullName: 'पूरा नाम',
    mobileNumber: 'मोबाइल नंबर',
    dob: 'जन्म तिथि',
    gender: 'लिंग',
    male: 'पुरुष',
    female: 'महिला',
    other: 'अन्य',
    legalNotice: 'कृपया अपना विवरण ठीक वैसे ही दर्ज करें जैसे आपके कानूनी दस्तावेजों पर है।',
    
    // Step 2 Vehicle
    bikeTitle: 'बाइक',
    bikeCategory: 'दो-पहिया वाहन',
    autoTitle: 'ऑटो',
    autoCategory: 'तीन-पहिया वाहन',
    cabTitle: 'कैब',
    cabCategory: 'चार-पहिया वाहन',
    vehicleMake: 'कंपनी / ब्रांड',
    vehicleModel: 'मॉडल',
    vehicleYear: 'पंजीकरण वर्ष',
    plateNumber: 'लाइसेंस प्लेट नंबर',
    
    // Step 3 Selfie
    takeSelfie: 'एक स्पष्ट सेल्फी लें',
    takeSelfieBtn: 'सेल्फी लें',
    useDefaultAvatar: 'डिफ़ॉल्ट प्रोफ़ाइल अवतार का उपयोग करें',
    guideline1: '• सुनिश्चित करें कि आपका चेहरा स्पष्ट दिखाई दे रहा है।',
    guideline2: '• धूप का चश्मा, टोपी और मास्क हटा दें।',
    guideline3: '• अच्छी रोशनी का उपयोग करें।',
    
    // Step 4 Documents
    idDocs: 'पहचान दस्तावेज',
    vehicleDocs: 'वाहन दस्तावेज',
    drivingLicence: 'ड्राइविंग लाइसेंस',
    aadhaarCard: 'आधार कार्ड',
    panCard: 'पैन कार्ड',
    rcDoc: 'वाहन पंजीकरण प्रमाणपत्र (RC)',
    insuranceDoc: 'वाहन बीमा',
    permitDoc: 'परमिट (कमर्शियल वाहन)',
    notStarted: 'शुरू नहीं हुआ',
    uploaded: 'अपलोड किया गया',
    underReview: 'समीक्षाधीन',
    verified: 'सत्यापित',
    rejected: 'अस्वीकृत',
    
    // Step 5 Payout
    bankAccount: 'बैंक खाता',
    upiId: 'यूपीआई आईडी',
    accountHolderName: 'खाता धारक का नाम',
    bankName: 'बैंक का नाम',
    accountNumber: 'खाता संख्या',
    confirmAccountNumber: 'खाता संख्या की पुष्टि करें',
    ifscCode: 'IFSC कोड',
    verifyAndContinue: 'पंजीकरण पूरा करें',
    secureNotice: '🔒 आपकी भुगतान जानकारी सुरक्षित रूप से एन्क्रिप्टेड है।',

    // Pending Review
    accountUnderReview: 'आपका खाता समीक्षाधीन है',
    underReviewSub: 'हम आपकी प्रोफ़ाइल और दस्तावेजों की समीक्षा कर रहे हैं। खाता तैयार होने पर आपको सूचित किया जाएगा।',
    profileCompleted: 'प्रोफ़ाइल पूरी हुई',
    documentsSubmitted: 'दस्तावेज़ जमा किए गए',
    payoutAdded: 'भुगतान विवरण जोड़ा गया',
    verificationInProgress: 'सत्यापन जारी है',
    startTrainingPrompt: 'प्रतीक्षा करते समय, कैप्टन सुरक्षा प्रशिक्षण पूरा करें।',
    startTrainingBtn: 'प्रशिक्षण शुरू करें',
    checkStatusBtn: '🔄 अनुमोदन स्थिति जांचें',

    // Dashboard
    offline: 'ऑफ़लाइन',
    online: 'ऑनलाइन',
    offlineDesc: 'राइड अनुरोध प्राप्त करने के लिए ऑनलाइन जाएं।',
    onlineDesc: 'राइड अनुरोध प्राप्त करने के लिए तैयार',
    goToArea: 'पसंदीदा क्षेत्र',
    todaysEarnings: 'आज की कमाई',
    completedTrips: 'पूरी हुई ट्रिप्स',
    onlineTime: 'ऑनलाइन समय',
    acceptRide: 'राइड स्वीकार करें ⚡',
    decline: 'अस्वीकार करें',

    // Navigation Tabs
    tripsTab: 'ट्रिप्स',
    earningsTab: 'कमाई',
    walletTab: 'वॉलेट',
    referTab: 'रेफर',
    profileTab: 'प्रोफ़ाइल',
  },
  te: {
    // Brand & Tagline
    appName: 'రైడ్‌నౌ కెప్టెన్',
    tagline: 'డ్రైవ్ చేయండి. సంపాదించండి. ఎదగండి.',
    subtagline: 'రైడ్‌నౌతో చేరండి మరియు ప్రతి ప్రయాణాన్ని సంపాదన అవకాశంగా మార్చుకోండి.',
    
    // Login
    emailLabel: 'ఈమెయిల్ చిరునామా',
    emailPlaceholder: 'captain@gmail.com',
    passwordLabel: 'పాస్‌వర్డ్',
    passwordPlaceholder: 'మీ పాస్‌వర్డ్ నమోదు చేయండి',
    continueBtn: 'కొనసాగించండి',
    forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?',
    newToRideNow: 'రైడ్‌నౌకి కొత్తవారా?',
    registerAsCaptain: 'కెప్టెన్‌గా నమోదు చేసుకోండి',
    loggingIn: 'సైన్ ఇన్ అవుతోంది...',
    invalidCredentials: 'చెల్లని ఈమెయిల్ లేదా పాస్‌వర్డ్. దయచేసి మళ్లీ ప్రయత్నించండి.',
    showPassword: 'చూపించు',
    hidePassword: 'దాచు',

    // Registration Steps
    step1Title: 'రైడ్‌నౌ కెప్టెన్ అవ్వండి',
    step1Sub: 'సంపాదించడం ప్రారంభించడానికి మీ వివరాలను పూరించండి.',
    step2Title: 'మీ వాహనాన్ని ఎంచుకోండి',
    step2Sub: 'రైడ్‌నౌ ట్రిప్పుల కోసం ఉపయోగించే వాహనాన్ని ఎంచుకోండి.',
    step3Title: 'మీ ప్రొఫైల్‌ను పూర్తి చేయండి',
    step3Sub: 'గుర్తింపు ధృవీకరణలో మాకు సహాయం చేయండి.',
    step4Title: 'మీ పత్రాలను ధృవీకరించండి',
    step4Sub: 'కెప్టెన్ ఖాతాను సక్రియం చేయడానికి ధృవీకరణను పూర్తి చేయండి.',
    step5Title: 'చెల్లింపు వివరాలను సెటప్ చేయండి',
    step5Sub: 'సంపాదనను స్వీకరించడానికి చెల్లింపు పద్ధతిని జోడించండి.',
    
    // Step 1 Details
    fullName: 'పూర్తి పేరు',
    mobileNumber: 'మొబైల్ నంబర్',
    dob: 'పుట్టిన తేదీ',
    gender: 'లింగం',
    male: 'పురుషుడు',
    female: 'స్త్రీ',
    other: 'ఇతర',
    legalNotice: 'దయచేసి మీ చట్టపరమైన పత్రాలలో ఉన్నట్లుగానే వివరాలను నమోదు చేయండి.',
    
    // Step 2 Vehicle
    bikeTitle: 'బైక్',
    bikeCategory: 'ద్విచక్ర వాహనం',
    autoTitle: 'ఆటో',
    autoCategory: 'త్రిచక్ర వాహనం',
    cabTitle: 'క్యాబ్',
    cabCategory: 'నాలుగు చక్రాల వాహనం',
    vehicleMake: 'కంపెనీ / బ్రాండ్',
    vehicleModel: 'మోడల్',
    vehicleYear: 'రిజిస్ట్రేషన్ సంవత్సరం',
    plateNumber: 'లైసెన్స్ ప్లేట్ నంబర్',
    
    // Step 3 Selfie
    takeSelfie: 'స్పష్టమైన సెల్ఫీ తీసుకోండి',
    takeSelfieBtn: 'సెల్ఫీ తీసుకోండి',
    useDefaultAvatar: 'డిఫాల్ట్ ప్రొఫైల్ అవతార్ ఉపయోగించండి',
    guideline1: '• మీ ముఖం స్పష్టంగా కనిపించేలా చూసుకోండి.',
    guideline2: '• సన్ గ్లాసెస్, క్యాప్స్ మరియు మాస్క్‌లను తీసివేయండి.',
    guideline3: '• మంచి వెలుతురును ఉపయోగించండి.',
    
    // Step 4 Documents
    idDocs: 'గుర్తింపు పత్రాలు',
    vehicleDocs: 'వాహన పత్రాలు',
    drivingLicence: 'డ్రైవింగ్ లైసెన్స్',
    aadhaarCard: 'ఆధార్ కార్డు',
    panCard: 'పాన్ కార్డు',
    rcDoc: 'వాహన రిజిస్ట్రేషన్ సర్టిఫికేట్ (RC)',
    insuranceDoc: 'వాహన బీమా',
    permitDoc: 'పర్మిట్ (కమర్షియల్ వాహనం)',
    notStarted: 'ప్రారంభం కాలేదు',
    uploaded: 'అప్‌లోడ్ చేయబడింది',
    underReview: 'సమీక్షలో ఉంది',
    verified: 'ధృవీకరించబడింది',
    rejected: 'తిరస్కరించబడింది',
    
    // Step 5 Payout
    bankAccount: 'బ్యాంక్ ఖాతా',
    upiId: 'యుపిఐ ఐడి',
    accountHolderName: 'ఖాతాదారుని పేరు',
    bankName: 'బ్యాంక్ పేరు',
    accountNumber: 'ఖాతా సంఖ్య',
    confirmAccountNumber: 'ఖాతా సంఖ్యను నిర్ధారించండి',
    ifscCode: 'IFSC కోడ్',
    verifyAndContinue: 'రిజిస్ట్రేషన్ పూర్తి చేయండి',
    secureNotice: '🔒 మీ చెల్లింపు సమాచారం సురక్షితంగా రక్షించబడింది.',

    // Pending Review
    accountUnderReview: 'మీ ఖాతా సమీక్షలో ఉంది',
    underReviewSub: 'మేము మీ ప్రొఫైల్ మరియు పత్రాలను సమీక్షిస్తున్నాము. ఖాతా సిద్ధమైనప్పుడు మీకు తెలియజేయబడుతుంది.',
    profileCompleted: 'ప్రొఫైల్ పూర్తయింది',
    documentsSubmitted: 'పత్రాలు సమర్పించబడ్డాయి',
    payoutAdded: 'చెల్లింపు వివరాలు జోడించబడ్డాయి',
    verificationInProgress: 'ధృవీకరణ పురోగతిలో ఉంది',
    startTrainingPrompt: 'వేచి ఉన్న సమయంలో, కెప్టెన్ భద్రతా శిక్షణను పూర్తి చేయండి.',
    startTrainingBtn: 'శిక్షణ ప్రారంభించండి',
    checkStatusBtn: '🔄 ఆమోద స్థితిని తనిఖీ చేయండి',

    // Dashboard
    offline: 'ఆఫ్‌లైన్',
    online: 'ఆన్‌లైన్',
    offlineDesc: 'రైడ్ అభ్యర్థనలను స్వీకరించడానికి ఆన్‌లైన్‌లోకి వెళ్లండి.',
    onlineDesc: 'రైడ్ అభ్యర్థనల కోసం సిద్ధంగా ఉంది',
    goToArea: 'ప్రాంతం ఎంచుకోండి',
    todaysEarnings: 'నేటి సంపాదన',
    completedTrips: 'పూర్తయిన ట్రిప్పులు',
    onlineTime: 'ఆన్‌లైన్ సమయం',
    acceptRide: 'రైడ్ అంగీకరించండి ⚡',
    decline: 'తిరస్కరించండి',

    // Navigation Tabs
    tripsTab: 'ట్రిప్పులు',
    earningsTab: 'సంపాదన',
    walletTab: 'వాలెట్',
    referTab: 'రిఫర్',
    profileTab: 'ప్రొఫైల్',
  },
};
