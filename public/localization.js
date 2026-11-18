// Translate interface copy only. Operational values, identifiers, inputs and exports stay unchanged.
const entries = `
Administration|រដ្ឋបាលប្រព័ន្ធ
Admin dashboard|ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ
User management|ការគ្រប់គ្រងអ្នកប្រើប្រាស់
Admin settings|ការកំណត់ប្រព័ន្ធ
Activity logs|កំណត់ហេតុសកម្មភាព
Manage TEAMS accounts, integrations and service activity.|គ្រប់គ្រងគណនី TEAMS ការតភ្ជាប់ និងសកម្មភាពសេវាកម្ម។
Set up Managing Director|កំណត់គណនីអគ្គនាយក
Authorization reference|ឯកសារយោងការអនុញ្ញាត
Active users|អ្នកប្រើប្រាស់សកម្ម
Storage used|ទំហំផ្ទុកដែលបានប្រើ
Request failures (24 hours)|សំណើបរាជ័យក្នុង ២៤ ម៉ោង
Slow requests (24 hours)|សំណើយឺតក្នុង ២៤ ម៉ោង
Service status|ស្ថានភាពសេវាកម្ម
Application database|មូលដ្ឋានទិន្នន័យកម្មវិធី
Document storage|កន្លែងផ្ទុកឯកសារ
Email sending|ការផ្ញើអ៊ីមែល
Email receiving|ការទទួលអ៊ីមែល
User accounts|គណនីអ្នកប្រើប្រាស់
Import accounts|នាំចូលគណនី
Deployment owner|ម្ចាស់ប្រព័ន្ធ
Configure platform connections and upload limits.|កំណត់ការតភ្ជាប់ប្រព័ន្ធ និងដែនកំណត់ការផ្ទុកឯកសារ។
Email (Resend)|អ៊ីមែល (Resend)
Configure email|កំណត់ការតភ្ជាប់អ៊ីមែល
Enable outbound email|បើកការផ្ញើអ៊ីមែល
Enable inbound email|បើកការទទួលអ៊ីមែល
Sender display name|ឈ្មោះបង្ហាញរបស់អ្នកផ្ញើ
Verified sender email|អ៊ីមែលអ្នកផ្ញើដែលបានផ្ទៀងផ្ទាត់
Document storage (R2)|កន្លែងផ្ទុកឯកសារ (R2)
Default per-user limit|ដែនកំណត់លំនាំដើមសម្រាប់អ្នកប្រើម្នាក់
Account storage used|ទំហំផ្ទុកដែលគណនីបានប្រើ
Set storage limit|កំណត់ដែនកំណត់ទំហំផ្ទុក
Set default storage limit|កំណត់ដែនកំណត់ទំហំផ្ទុកលំនាំដើម
Storage limit (MB)|ដែនកំណត់ទំហំផ្ទុក (MB)
Unlimited|គ្មានដែនកំណត់
AI review (OpenAI)|ការពិនិត្យដោយ AI (OpenAI)
Configure AI review|កំណត់ការពិនិត្យដោយ AI
Enable AI review|បើកការពិនិត្យដោយ AI
OpenAI model|ម៉ូដែល OpenAI
Team daily limit|ដែនកំណត់ប្រចាំថ្ងៃសម្រាប់ក្រុម
User daily limit|ដែនកំណត់ប្រចាំថ្ងៃសម្រាប់អ្នកប្រើ
Request diagnostics|ការត្រួតពិនិត្យសំណើ
Audit activity|សកម្មភាពសវនកម្ម
Last seen (UTC)|បានកត់ត្រាចុងក្រោយ (UTC)
HTTP status|ស្ថានភាព HTTP
Longest (ms)|រយៈពេលយូរបំផុត (ms)
Diagnostic storage is unavailable.|កន្លែងផ្ទុកទិន្នន័យត្រួតពិនិត្យមិនអាចប្រើបាន។
Review tender with AI|ពិនិត្យឯកសារដេញថ្លៃដោយ AI
Extract BOQ with AI|ស្រង់បញ្ជីបរិមាណដោយ AI
Review quotation with AI|ពិនិត្យសម្រង់តម្លៃដោយ AI
Start AI review|ចាប់ផ្តើមពិនិត្យដោយ AI
OpenAI processes the saved quotation scope, accessible approved tender scope and any PDF you select. Confirm sharing permission and verify the findings.|OpenAI ដំណើរការវិសាលភាពក្នុងសម្រង់តម្លៃដែលបានរក្សាទុក វិសាលភាពដេញថ្លៃដែលបានអនុម័តនិងអ្នកអាចមើលបាន និងឯកសារ PDF ដែលអ្នកជ្រើស។ បញ្ជាក់សិទ្ធិចែករំលែក ហើយផ្ទៀងផ្ទាត់លទ្ធផល។
OpenAI processes the selected PDF. Confirm sharing permission and verify the findings and references against the document.|OpenAI ដំណើរការឯកសារ PDF ដែលបានជ្រើស។ បញ្ជាក់សិទ្ធិចែករំលែក ហើយផ្ទៀងផ្ទាត់លទ្ធផល និងឯកសារយោងជាមួយឯកសារដើម។
Source PDF|ឯកសារ PDF ប្រភព
Select source pdf|ជ្រើសឯកសារ PDF ប្រភព
Use saved scope only|ប្រើតែវិសាលភាពដែលបានរក្សាទុក
I have permission to share the selected source for AI processing|ខ្ញុំមានសិទ្ធិចែករំលែកប្រភពដែលបានជ្រើស ដើម្បីឱ្យ AI ដំណើរការ
Attach a source PDF to this tender first.|សូមភ្ជាប់ឯកសារ PDF ប្រភពទៅឯកសារដេញថ្លៃនេះជាមុន។
Reviewing source. This can take up to 45 seconds.|កំពុងពិនិត្យប្រភព។ ដំណើរការនេះអាចចំណាយពេលរហូតដល់ ៤៥ វិនាទី។
AI review results|លទ្ធផលពិនិត្យដោយ AI
AI review. Check every finding and quantity against the source before use.|លទ្ធផលពិនិត្យដោយ AI។ ផ្ទៀងផ្ទាត់រាល់លទ្ធផល និងបរិមាណជាមួយប្រភពមុនពេលប្រើ។
Findings|ចំណុចរកឃើញ
Topic|ប្រធានបទ
Observation|ចំណុចសង្កេត
Extracted BOQ lines|បន្ទាត់បរិមាណដែលបានស្រង់
The BOQ needs correction or completion. Review a smaller PDF section or import the verified BOQ workbook.|បញ្ជីបរិមាណត្រូវកែតម្រូវ ឬបំពេញ។ ពិនិត្យផ្នែក PDF តូចជាង ឬនាំចូលសៀវភៅបញ្ជីបរិមាណដែលបានផ្ទៀងផ្ទាត់។
Back to record|ត្រឡប់ទៅកំណត់ត្រា
Download source PDF|ទាញយកឯកសារ PDF ប្រភព
Open tender editor with confirmed lines|បើកទម្រង់ដេញថ្លៃជាមួយបន្ទាត់ដែលបានបញ្ជាក់
Confirm every BOQ line against the source PDF before continuing.|ផ្ទៀងផ្ទាត់បន្ទាត់បរិមាណទាំងអស់ជាមួយឯកសារ PDF ប្រភព មុនបន្ត។
Confirmed AI lines are ready for review and saving.|បន្ទាត់ដែលបានផ្ទៀងផ្ទាត់ពី AI អាចពិនិត្យ និងរក្សាទុកបាន។
Confirm permission to process the selected AI source.|បញ្ជាក់សិទ្ធិប្រើប្រភពដែលបានជ្រើសសម្រាប់ AI។
AI review is unavailable for this account.|គណនីនេះមិនអាចប្រើការពិនិត្យដោយ AI បានទេ។
AI review limit reached. Wait before trying again or continue with manual review.|បានដល់កម្រិតពិនិត្យដោយ AI។ រង់ចាំមុនពេលសាកល្បងម្ដងទៀត ឬបន្តពិនិត្យដោយផ្ទាល់។
AI review is temporarily unavailable. Continue with manual review or try again later.|មិនអាចពិនិត្យដោយ AI ជាបណ្ដោះអាសន្ន។ បន្តពិនិត្យដោយផ្ទាល់ ឬសាកល្បងម្ដងទៀតពេលក្រោយ។
AI returned an incomplete review. Check the source manually or review a smaller section.|AI ពិនិត្យមិនពេញលេញ។ ផ្ទៀងផ្ទាត់ប្រភពដោយផ្ទាល់ ឬពិនិត្យផ្នែកតូចជាង។
Select a PDF source attachment.|ជ្រើសឯកសារ PDF ប្រភពដែលបានភ្ជាប់។
AI review accepts a PDF up to 4 MB. Split large files into sections.|AI អាចពិនិត្យឯកសារ PDF រហូតដល់ ៤ MB។ បែងចែកឯកសារធំជាផ្នែក។
A tender BOQ already exists. Review it before changing the material lines.|មានបញ្ជីបរិមាណដេញថ្លៃរួចហើយ។ ពិនិត្យបញ្ជីនេះមុនផ្លាស់ប្តូរបន្ទាត់សម្ភារៈ។
Restricted to Managing Director and Accounting & Finance Manager.|សម្រាប់តែនាយកគ្រប់គ្រង និងអ្នកគ្រប់គ្រងគណនេយ្យនិងហិរញ្ញវត្ថុ។
Commercial invoices, tax invoices and collection records. Issued copies are locked and changes are audited.|វិក្កយបត្រពាណិជ្ជកម្ម វិក្កយបត្រអាករ និងកំណត់ត្រាប្រមូលប្រាក់។ ឯកសារដែលបានចេញត្រូវបានចាក់សោ ហើយការផ្លាស់ប្តូរត្រូវបានកត់ត្រា។
Public demo invoices are simulated. No TIN, tax registration or signatory is invented.|វិក្កយបត្រក្នុងការបង្ហាញសាធារណៈនេះគ្រាន់តែជាការសាកល្បង។ មិនបង្កើតលេខអត្តសញ្ញាណកម្មសារពើពន្ធ ការចុះបញ្ជីពន្ធ ឬអ្នកចុះហត្ថលេខាឡើយ។
This issues a simulated invoice. No real tax document or payment request is created.|នេះជាការចេញវិក្កយបត្រសាកល្បង។ មិនបង្កើតឯកសារពន្ធ ឬសំណើទូទាត់ពិតប្រាកដឡើយ។
Project (optional)|គម្រោង (មិនចាំបាច់)
Maintenance contract (optional)|កិច្ចសន្យាថែទាំ (មិនចាំបាច់)
Exchange rate date|កាលបរិច្ឆេទអត្រាប្តូរប្រាក់
Unit rate|តម្លៃឯកតា
Customer PO / reference|បញ្ជាទិញឬឯកសារយោងរបស់អតិថិជន
Use an approved quotation|ប្រើសម្រង់តម្លៃដែលបានអនុម័ត
Choose a quotation (optional)|ជ្រើសសម្រង់តម្លៃ (មិនចាំបាច់)
Load quotation lines|ទាញយកបញ្ជីពីសម្រង់តម្លៃ
Official company name|ឈ្មោះក្រុមហ៊ុនផ្លូវការ
Registered Khmer name|ឈ្មោះជាភាសាខ្មែរដែលបានចុះបញ្ជី
Taxpayer classification|ចំណាត់ថ្នាក់អ្នកជាប់ពន្ធ
VAT TIN|លេខអត្តសញ្ញាណកម្មសារពើពន្ធ
Registered address|អាសយដ្ឋានដែលបានចុះបញ្ជី
Public contact address|អាសយដ្ឋានទំនាក់ទំនងសាធារណៈ
Live issuance|ការចេញវិក្កយបត្រពិតប្រាកដ
Finance verification required|ត្រូវផ្ទៀងផ្ទាត់ដោយផ្នែកហិរញ្ញវត្ថុ
Not configured|មិនទាន់កំណត់
Not verified|មិនទាន់ផ្ទៀងផ្ទាត់
Invoice amount|ទឹកប្រាក់វិក្កយបត្រ
Payments recorded|ការទូទាត់ដែលបានកត់ត្រា
Assigned when issued|កំណត់លេខនៅពេលចេញវិក្កយបត្រ
Service contract|កិច្ចសន្យាសេវាកម្ម
Void reason|មូលហេតុមោឃភាព
Void reason / authorization reference|មូលហេតុមោឃភាព ឬឯកសារយោងអនុញ្ញាត
Record legacy invoice reference|កត់ត្រាលេខយោងវិក្កយបត្រចាស់
Small|តូច
Medium|មធ្យម
Large|ធំ
Registered details verified for live issuance|បានផ្ទៀងផ្ទាត់ព័ត៌មានចុះបញ្ជីសម្រាប់ចេញវិក្កយបត្រពិតប្រាកដ

Accounting & Finance Manager|អ្នកគ្រប់គ្រងគណនេយ្យ និងហិរញ្ញវត្ថុ
Create invoice|បង្កើតវិក្កយបត្រ
Invoice register|បញ្ជីវិក្កយបត្រ
Invoice|វិក្កយបត្រ
Commercial Invoice|វិក្កយបត្រពាណិជ្ជកម្ម
Tax Invoice|វិក្កយបត្រអាករ
Legacy reference|ឯកសារយោងចាស់
Company invoice profile|ព័ត៌មានក្រុមហ៊ុនសម្រាប់វិក្កយបត្រ
Edit invoice profile|កែប្រែព័ត៌មានវិក្កយបត្រ
Accounting integration|ការភ្ជាប់ប្រព័ន្ធគណនេយ្យ
Not connected|មិនទាន់ភ្ជាប់
Export accounting data|នាំចេញទិន្នន័យគណនេយ្យ
Financial audit history|ប្រវត្តិសវនកម្មហិរញ្ញវត្ថុ
Invoice subject|កម្មវត្ថុវិក្កយបត្រ
Invoice type|ប្រភេទវិក្កយបត្រ
Invoice date|កាលបរិច្ឆេទវិក្កយបត្រ
Customer legal name|ឈ្មោះអតិថិជនតាមផ្លូវច្បាប់
Customer legal name in Khmer|ឈ្មោះអតិថិជនជាភាសាខ្មែរ
Customer billing address|អាសយដ្ឋានអតិថិជន
Customer billing address in Khmer|អាសយដ្ឋានអតិថិជនជាភាសាខ្មែរ
Customer VAT TIN|លេខអត្តសញ្ញាណកម្មសារពើពន្ធរបស់អតិថិជន
VAT rate (%)|អត្រាអាករលើតម្លៃបន្ថែម (%)
Exchange rate source / reference|ប្រភពឬឯកសារយោងអត្រាប្តូរប្រាក់
Invoice total|ទឹកប្រាក់សរុបវិក្កយបត្រ
Invoice line|បន្ទាត់វិក្កយបត្រ
Description in Khmer|បរិយាយជាភាសាខ្មែរ
Add invoice line|បន្ថែមបន្ទាត់វិក្កយបត្រ
Save invoice draft|រក្សាទុកព្រាងវិក្កយបត្រ
Edit invoice draft|កែប្រែព្រាងវិក្កយបត្រ
Edit draft|កែប្រែសេចក្តីព្រាង
Issue invoice|ចេញវិក្កយបត្រ
Void invoice|មោឃភាពវិក្កយបត្រ
Client invoice PDF|វិក្កយបត្រអតិថិជន PDF
Print invoice|បោះពុម្ពវិក្កយបត្រ
Invoice line items|បញ្ជីទំនិញនិងសេវាលើវិក្កយបត្រ
Invoice totals|ទឹកប្រាក់វិក្កយបត្រសរុប
Invoice number|លេខវិក្កយបត្រ
Issued document|ឯកសារដែលបានចេញ
Before VAT|មុនអាករលើតម្លៃបន្ថែម
VAT|អាករលើតម្លៃបន្ថែម
Void|មោឃៈ
Company invoice profile|ព័ត៌មានក្រុមហ៊ុនសម្រាប់វិក្កយបត្រ
Registered company name in Khmer|ឈ្មោះក្រុមហ៊ុនដែលបានចុះបញ្ជីជាភាសាខ្មែរ
Company VAT TIN|លេខអត្តសញ្ញាណកម្មសារពើពន្ធក្រុមហ៊ុន
Registered taxpayer classification|ចំណាត់ថ្នាក់អ្នកជាប់ពន្ធដែលបានចុះបញ្ជី
Registered company address|អាសយដ្ឋានក្រុមហ៊ុនដែលបានចុះបញ្ជី
Registered company address in Khmer|អាសយដ្ឋានក្រុមហ៊ុនដែលបានចុះបញ្ជីជាភាសាខ្មែរ
Company phone|លេខទូរស័ព្ទក្រុមហ៊ុន
Company invoice email|អ៊ីមែលក្រុមហ៊ុនសម្រាប់វិក្កយបត្រ
Payment instructions / bank details|ការណែនាំទូទាត់ និងព័ត៌មានគណនីធនាគារ
Authorized invoice signatory|អ្នកមានសិទ្ធិចុះហត្ថលេខាលើវិក្កយបត្រ
Verification reference|ឯកសារយោងផ្ទៀងផ្ទាត់
Save invoice profile|រក្សាទុកព័ត៌មានវិក្កយបត្រ

Home|ទំព័រដើម
Overview|ទិដ្ឋភាពទូទៅ
OVERVIEW|ទិដ្ឋភាពទូទៅ
Commercial & Design|ពាណិជ្ជកម្ម និងការរចនា
COMMERCIAL & DESIGN|ពាណិជ្ជកម្ម និងការរចនា
Project & Service Delivery|ការអនុវត្តគម្រោង និងសេវាកម្ម
PROJECT & SERVICE DELIVERY|ការអនុវត្តគម្រោង និងសេវាកម្ម
Procurement & Logistics|លទ្ធកម្ម និងភស្តុភារ
PROCUREMENT & LOGISTICS|លទ្ធកម្ម និងភស្តុភារ
Finance & Support|ហិរញ្ញវត្ថុ និងការគាំទ្រ
FINANCE & SUPPORT|ហិរញ្ញវត្ថុ និងការគាំទ្រ
ENGINEERING OPERATIONS|ប្រតិបត្តិការវិស្វកម្ម
Roles & PICs|តួនាទី និងអ្នកទទួលបន្ទុក
Operating structure|រចនាសម្ព័ន្ធប្រតិបត្តិការ
Clients & Projects|អតិថិជន និងគម្រោង
Tenders & Bidding|ការដេញថ្លៃ
Material Prices|តម្លៃសម្ភារៈ
Quotations & Estimates|សម្រង់តម្លៃ និងការប៉ាន់ស្មាន
Project Operations|ប្រតិបត្តិការគម្រោង
Maintenance Services|សេវាថែទាំ
Procurement|លទ្ធកម្ម
Inventory|សារពើភ័ណ្ឌ
HR & Employees|ធនធានមនុស្ស និងបុគ្គលិក
Billing & Collections|ការចេញវិក្កយបត្រ និងការប្រមូលប្រាក់
Reports|របាយការណ៍
Email|អ៊ីមែល
Documents|ឯកសារ
Settings|ការកំណត់
Settings / Employees|ការកំណត់ / បុគ្គលិក
Settings / Roles|ការកំណត់ / តួនាទី
Workspace|កន្លែងធ្វើការ
Search records...|ស្វែងរកទិន្នន័យ...
Search records|ស្វែងរកទិន្នន័យ
View exceptions|មើលបញ្ហាត្រូវពិនិត្យ
Account and role|គណនី និងតួនាទី
Toggle navigation|បើកបិទម៉ឺនុយ
Close navigation|បិទម៉ឺនុយ
Main navigation|ម៉ឺនុយចម្បង
Field navigation|ម៉ឺនុយការងារនៅទីតាំង
TEAMS Operations home|ទំព័រដើម TEAMS
Skip to main content|ទៅមាតិកាចម្បង
Loading TEAMS Operations...|កំពុងផ្ទុក TEAMS Operations...
Workspace unavailable|មិនអាចបើកកន្លែងធ្វើការបាន
Continue with ChatGPT|បន្តជាមួយ ChatGPT
Retry|សាកម្ដងទៀត
Platform Administrator|អ្នកគ្រប់គ្រងប្រព័ន្ធ
Managing Director|នាយកគ្រប់គ្រង
Business Manager|អ្នកគ្រប់គ្រងអាជីវកម្ម
Head of MEP|ប្រធានផ្នែក MEP
Engineering & Estimation|វិស្វកម្ម និងប៉ាន់ស្មានតម្លៃ
Project Manager|អ្នកគ្រប់គ្រងគម្រោង
Stock Controller|អ្នកត្រួតពិនិត្យស្តុក
Maintenance Supervisor|អ្នកត្រួតពិនិត្យការថែទាំ
Maintenance Technician|អ្នកបច្ចេកទេសថែទាំ
Accounting & Finance|គណនេយ្យ និងហិរញ្ញវត្ថុ
HR & Administration|ធនធានមនុស្ស និងរដ្ឋបាល
Read-Only Auditor|សវនករមានសិទ្ធិអានប៉ុណ្ណោះ
Installation Lead|អ្នកដឹកនាំការដំឡើង
Installation Technician|អ្នកបច្ចេកទេសដំឡើង
Maintenance Team Leader|ប្រធានក្រុមថែទាំ
Logistics|ភស្តុភារ
Account|គណនី
Public demo|ការបង្ហាញសាកល្បងសាធារណៈ
Demo workspace|កន្លែងសាកល្បង
TEAMS Demo|TEAMS សាកល្បង
Switch demo role|ប្ដូរតួនាទីសាកល្បង
Fictional records. Changes are saved in this browser.|ទិន្នន័យគំរូ។ ការផ្លាស់ប្ដូរត្រូវបានរក្សាទុកក្នុងកម្មវិធីរុករកនេះ។
All clients, projects and financial figures are fictional.|អតិថិជន គម្រោង និងតួលេខហិរញ្ញវត្ថុទាំងអស់ជាទិន្នន័យគំរូ។
Operations dashboard|ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិការ
Explore how TEAMS handles tenders, installation, maintenance and the work between them.|សាកល្បងការដេញថ្លៃ ការដំឡើង ការថែទាំ និងការសហការរវាងផ្នែកនៅ TEAMS។
Viewing as|កំពុងប្រើតួនាទី
Fictional projects and figures|គម្រោង និងតួលេខគំរូ
Operational overview|ទិដ្ឋភាពប្រតិបត្តិការ
Work queue|បញ្ជីការងារ
My work|ការងាររបស់ខ្ញុំ
All items|ទាំងអស់
All|ទាំងអស់
Quick actions|សកម្មភាពរហ័ស
Operational exceptions|បញ្ហាប្រតិបត្តិការត្រូវពិនិត្យ
Records requiring review.|ទិន្នន័យដែលត្រូវពិនិត្យ។
No current exceptions.|មិនមានបញ្ហាត្រូវពិនិត្យ។
Open records ordered by due date.|ការងារកំពុងបើក រៀបតាមថ្ងៃកំណត់។
Open full queue|បើកបញ្ជីទាំងមូល
View all|មើលទាំងអស់
View details|មើលព័ត៌មានលម្អិត
Service workflows|លំហូរការងារសេវាកម្ម
Explore a service|ស្វែងយល់សេវាកម្ម
Delivery owner|អ្នកទទួលបន្ទុកអនុវត្ត
Process owner|អ្នកទទួលបន្ទុកដំណើរការ
Next step|ជំហានបន្ទាប់
Active projects|គម្រោងកំពុងដំណើរការ
Open quotations|សម្រង់តម្លៃកំពុងដំណើរការ
Outstanding collections|ប្រាក់ត្រូវប្រមូល
Pending approvals|រង់ចាំអនុម័ត
Low stock|ស្តុកទាប
Overdue visits|ការចុះថែទាំហួសកំណត់
Project position|ស្ថានភាពគម្រោង
Cost and cash position|ស្ថានភាពថ្លៃដើម និងសាច់ប្រាក់
Approved value|តម្លៃបានអនុម័ត
Budget|ថវិកា
Actual cost|ចំណាយជាក់ស្ដែង
Incurred direct cost|ចំណាយផ្ទាល់ដែលកើតឡើង
Open commitments|កាតព្វកិច្ចចំណាយកំពុងបើក
Uncommitted cost to complete|ចំណាយបន្ថែមដើម្បីបញ្ចប់
Forecast total|ចំណាយសរុបព្យាករ
Forecast margin|អត្រាចំណេញព្យាករ
Collected|បានប្រមូល
Outstanding|នៅជំពាក់
Clients|អតិថិជន
Client|អតិថិជន
Add client|បន្ថែមអតិថិជន
New client|អតិថិជនថ្មី
Client profiles|ប្រវត្តិអតិថិជន
Edit client profile|កែប្រែប្រវត្តិអតិថិជន
Add maintenance client|បន្ថែមអតិថិជនថែទាំ
Share with Maintenance|ចែករំលែកជាមួយផ្នែកថែទាំ
Share client with Maintenance|ចែករំលែកអតិថិជនជាមួយផ្នែកថែទាំ
Service teams|ក្រុមសេវាកម្ម
Maintenance|ការថែទាំ
Installation|ការដំឡើង
Shared|ប្រើរួម
Company|ក្រុមហ៊ុន
Customer type|ប្រភេទអតិថិជន
Billing address|អាសយដ្ឋានវិក្កយបត្រ
Tax ID|លេខអត្តសញ្ញាណកម្មសារពើពន្ធ
Contact|អ្នកទំនាក់ទំនង
Contacts|អ្នកទំនាក់ទំនង
Contact name|ឈ្មោះអ្នកទំនាក់ទំនង
Phone|ទូរស័ព្ទ
Address|អាសយដ្ឋាន
Notes|កំណត់សម្គាល់
Name|ឈ្មោះ
Type|ប្រភេទ
Code|លេខកូដ
Location|ទីតាំង
Projects|គម្រោង
Project|គម្រោង
New project|គម្រោងថ្មី
Create project|បង្កើតគម្រោង
Project lead|អ្នកដឹកនាំគម្រោង
Assigned staff|បុគ្គលិកបានចាត់តាំង
Site|ទីតាំងការងារ
Site address|អាសយដ្ឋានទីតាំង
Contract|កិច្ចសន្យា
Start|ចាប់ផ្ដើម
Start date|ថ្ងៃចាប់ផ្ដើម
End date|ថ្ងៃបញ្ចប់
Expected completion|ថ្ងៃរំពឹងបញ្ចប់
Completion|ការបញ្ចប់
Payment terms|លក្ខខណ្ឌទូទាត់
Retention|ប្រាក់កាត់ទុកធានា
Progress history|ប្រវត្តិវឌ្ឍនភាព
Progress|វឌ្ឍនភាព
Update progress|កត់ត្រាវឌ្ឍនភាព
Record cost|កត់ត្រាចំណាយ
Manual direct costs|ចំណាយផ្ទាល់បញ្ចូលដោយដៃ
Add variation|បន្ថែមការងារប្រែប្រួល
Variation orders|ការងារប្រែប្រួល
Variation|ការងារប្រែប្រួល
Add milestone|បន្ថែមដំណាក់កាលទូទាត់
Prepare claim|រៀបចំសំណើទូទាត់
Progress claims|សំណើទូទាត់តាមវឌ្ឍនភាព
Assign project team|ចាត់តាំងក្រុមគម្រោង
Project tasks|ភារកិច្ចគម្រោង
Project task|ភារកិច្ចគម្រោង
Create task|បង្កើតភារកិច្ច
Update task|កែប្រែភារកិច្ច
Reassign task|ចាត់តាំងភារកិច្ចឡើងវិញ
Task|ភារកិច្ច
Owner|អ្នកទទួលបន្ទុក
Due|ថ្ងៃកំណត់
Deadline|ថ្ងៃផុតកំណត់
Task details|ព័ត៌មានភារកិច្ច
Latest update|ការកត់ត្រាចុងក្រោយ
Tenders|ការដេញថ្លៃ
Tender|ការដេញថ្លៃ
New tender|ការដេញថ្លៃថ្មី
Add tender|បន្ថែមការដេញថ្លៃ
Edit assessment|កែប្រែការវាយតម្លៃ
Stage|ដំណាក់កាល
Contract value|តម្លៃកិច្ចសន្យា
Estimate|ការប៉ាន់ស្មាន
Bid recommendation|អនុសាសន៍ដេញថ្លៃ
Expected profit|ប្រាក់ចំណេញរំពឹង
Expected margin|អត្រាចំណេញរំពឹង
Peak cash deficit|កង្វះសាច់ប្រាក់អតិបរមា
Collateral held|ប្រាក់ធានាត្រូវរក្សាទុក
Duration|រយៈពេល
Needs review|ត្រូវពិនិត្យ
Verified terms and source references|លក្ខខណ្ឌបានផ្ទៀងផ្ទាត់ និងឯកសារយោង
Scope of work|វិសាលភាពការងារ
Tender material BOQ|តារាងបរិមាណសម្ភារៈដេញថ្លៃ
Cash exposure by month|ហានិភ័យសាច់ប្រាក់តាមខែ
Month|ខែ
Expected receipts|ចំណូលរំពឹង
Expected spending|ចំណាយរំពឹង
Running cash|សមតុល្យសាច់ប្រាក់
Source|ប្រភព
Quotation preparation|ការរៀបចំសម្រង់តម្លៃ
AI quotation demo|សម្រង់តម្លៃ AI សាកល្បង
Quotations|សម្រង់តម្លៃ
Quotation|សម្រង់តម្លៃ
Create quotation|បង្កើតសម្រង់តម្លៃ
Save quotation|រក្សាទុកសម្រង់តម្លៃ
Edit quotation|កែប្រែសម្រង់តម្លៃ
Quotation title|ចំណងជើងសម្រង់តម្លៃ
Existing project, if applicable|គម្រោងដែលមាន ប្រសិនបើពាក់ព័ន្ធ
Currency|រូបិយប័ណ្ណ
Target gross margin (%)|អត្រាចំណេញដុលគោលដៅ (%)
Tax (%)|ពន្ធ (%)
Indirect costs|ចំណាយប្រយោល
Risk allowance|ប្រាក់បម្រុងហានិភ័យ
Discount|បញ្ចុះតម្លៃ
Valid through|មានសុពលភាពដល់
Warranty|ការធានា
Exclusions and qualifications|ការលើកលែង និងលក្ខខណ្ឌកំណត់
Material price list|បញ្ជីតម្លៃសម្ភារៈ
Quantity|បរិមាណ
Qty|បរិមាណ
Add material|បន្ថែមសម្ភារៈ
Import a BOQ|នាំចូលតារាងបរិមាណ
Add line|បន្ថែមបន្ទាត់
Remove line|លុបបន្ទាត់
Section|ផ្នែក
Description|ការពិពណ៌នា
Specification|លក្ខណៈបច្ចេកទេស
Unit|ឯកតា
Material match|សម្ភារៈដែលត្រូវគ្នា
Material / unit|ថ្លៃសម្ភារៈ / ឯកតា
Labor h / unit|ម៉ោងពលកម្ម / ឯកតា
Labor rate|អត្រាពលកម្ម
Other / unit|ចំណាយផ្សេង / ឯកតា
Price evidence / override|ភស្តុតាងតម្លៃ / ការកែតម្លៃ
Manual|បញ្ចូលដោយដៃ
Select a priced material|ជ្រើសសម្ភារៈមានតម្លៃ
Material prices need review|តម្លៃសម្ភារៈត្រូវពិនិត្យ
Estimated cost|ចំណាយប៉ាន់ស្មាន
Price before tax|តម្លៃមុនពន្ធ
Client total|តម្លៃសរុបសម្រាប់អតិថិជន
Gross margin|អត្រាចំណេញដុល
Markup|អត្រាបូកលើថ្លៃដើម
Selling price|តម្លៃលក់
Margin|អត្រាចំណេញ
Client PDF|PDF សម្រាប់អតិថិជន
Client Excel|Excel សម្រាប់អតិថិជន
Internal estimate|ការប៉ាន់ស្មានផ្ទៃក្នុង
Record acceptance|កត់ត្រាការយល់ព្រម
Reject|បដិសេធ
Expired|ផុតសុពលភាព
Approval snapshot|ព័ត៌មានការអនុម័តដែលបានចាក់សោ
Locked revision|កំណែបានចាក់សោ
Approved on|ថ្ងៃអនុម័ត
History|ប្រវត្តិ
Reference|ឯកសារយោង
Client documents and email|ឯកសារអតិថិជន និងអ៊ីមែល
Email client|ផ្ញើអ៊ីមែលជូនអតិថិជន
Purchase requisitions|សំណើទិញ
Purchase requisition|សំណើទិញ
Requisition|សំណើទិញ
Request purchase|ស្នើសុំទិញ
Material requirements|តម្រូវការសម្ភារៈ
Material requirement|តម្រូវការសម្ភារៈ
Material|សម្ភារៈ
Materials|សម្ភារៈ
Supplier|អ្នកផ្គត់ផ្គង់
Suppliers|អ្នកផ្គត់ផ្គង់
Add supplier|បន្ថែមអ្នកផ្គត់ផ្គង់
Supplier offers|សំណើតម្លៃអ្នកផ្គត់ផ្គង់
Supplier offer|សំណើតម្លៃអ្នកផ្គត់ផ្គង់
Purchase order|បញ្ជាទិញ
Purchase orders|បញ្ជាទិញ
Order|បញ្ជាទិញ
Create purchase order|បង្កើតបញ្ជាទិញ
Receive goods|ទទួលទំនិញ
Goods receipt|បង្កាន់ដៃទទួលទំនិញ
Received quantity|បរិមាណបានទទួល
Required quantity|បរិមាណត្រូវការ
Requested quantity|បរិមាណស្នើសុំ
Available stock|ស្តុកដែលអាចប្រើបាន
Requesting employee|បុគ្គលិកស្នើសុំ
Requested by|អ្នកស្នើសុំ
Unit price|តម្លៃឯកតា
Total|សរុប
Amount|ទឹកប្រាក់
Cost|ចំណាយ
Price|តម្លៃ
Date|កាលបរិច្ឆេទ
Status|ស្ថានភាព
Action|សកម្មភាព
Actions|សកម្មភាព
Warehouse|ឃ្លាំង
Warehouses|ឃ្លាំង
Add warehouse|បន្ថែមឃ្លាំង
Stock movement|ចលនាស្តុក
Stock movements|ចលនាស្តុក
Stock count|ការរាប់ស្តុក
Stock counts|ការរាប់ស្តុក
Issue materials|បញ្ចេញសម្ភារៈ
Record movement|កត់ត្រាចលនាស្តុក
Count stock|រាប់ស្តុក
Transfer|ផ្ទេរ
Return|ប្រគល់ត្រឡប់
Issue|បញ្ចេញ
Receipt|ទទួលចូល
Opening|ស្តុកដើមគ្រា
Reserved|បានបម្រុងទុក
Available|អាចប្រើបាន
On hand|ស្តុកនៅក្នុងដៃ
Minimum|អប្បបរមា
Barcode|លេខកូដបាកូដ
Scan barcode|ស្កេនបាកូដ
Search materials|ស្វែងរកសម្ភារៈ
Search|ស្វែងរក
Category|ប្រភេទ
Aging|អាយុកាលស្តុក
Last movement|ចលនាចុងក្រោយ
Maintenance contracts|កិច្ចសន្យាថែទាំ
Service contract|កិច្ចសន្យាសេវាកម្ម
New service contract|កិច្ចសន្យាសេវាកម្មថ្មី
Edit service plan|កែប្រែផែនការសេវាកម្ម
Service model|ទម្រង់សេវាកម្ម
Maintenance service type|ប្រភេទសេវាថែទាំ
MEP O&M|ប្រតិបត្តិការ និងថែទាំ MEP
Scheduled Maintenance Agreement|កិច្ចព្រមព្រៀងថែទាំតាមកាលវិភាគ
Scheduled Maintenance|ការថែទាំតាមកាលវិភាគ
Troubleshooting (one time)|ជួសជុលដោះស្រាយបញ្ហា (មួយលើក)
Contract title|ចំណងជើងកិច្ចសន្យា
Billing frequency|វដ្ដទូទាត់
Coverage days and hours|ថ្ងៃ និងម៉ោងប្រចាំការ
Resident technicians (0 for visit-only)|អ្នកបច្ចេកទេសប្រចាំទីតាំង (0 សម្រាប់ចុះតាមលើក)
Staffing, shifts, relief and overtime plan|ផែនការបុគ្គលិក វេន អ្នកជំនួស និងម៉ោងបន្ថែម
Visit / operations round interval (days)|ចន្លោះពេលចុះថែទាំ / វេនប្រតិបត្តិការ (ថ្ងៃ)
Maintenance supervisor|អ្នកត្រួតពិនិត្យថែទាំ
Default technician|អ្នកបច្ចេកទេសលំនាំដើម
Supervisor|អ្នកត្រួតពិនិត្យ
Technician|អ្នកបច្ចេកទេស
Assigned technician|អ្នកបច្ចេកទេសបានចាត់តាំង
Service agreement|កិច្ចព្រមព្រៀងសេវាកម្ម
Prepare agreement|រៀបចំកិច្ចព្រមព្រៀង
Prepare agreement revision|រៀបចំកំណែកិច្ចព្រមព្រៀង
Edit service agreement|កែប្រែកិច្ចព្រមព្រៀងសេវាកម្ម
Generate visits|បង្កើតការចុះថែទាំ
Generate jobs|បង្កើតការងារថែទាំ
Service visits|ការចុះថែទាំ
Service visit|ការចុះថែទាំ
Scheduled visits|ការចុះថែទាំបានកំណត់
Assigned work|ការងារបានចាត់តាំង
Complete job|បញ្ចប់ការងារ
Complete visit|បញ្ចប់ការចុះថែទាំ
Checklist|បញ្ជីត្រួតពិនិត្យ
Findings|លទ្ធផលត្រួតពិនិត្យ
Work performed|ការងារបានអនុវត្ត
Recommendations|អនុសាសន៍
Materials used|សម្ភារៈបានប្រើ
Service report|របាយការណ៍សេវាកម្ម
Job report|របាយការណ៍ការងារ
Attachments|ឯកសារភ្ជាប់
Attachment|ឯកសារភ្ជាប់
Attach file|ភ្ជាប់ឯកសារ
Upload|ផ្ទុកឡើង
Upload files|ផ្ទុកឯកសារឡើង
File|ឯកសារ
File name|ឈ្មោះឯកសារ
Download|ទាញយក
Open|បើក
Close|បិទ
Cancel|បោះបង់
Save|រក្សាទុក
Submit|បញ្ជូន
Confirm|បញ្ជាក់
Approve|អនុម័ត
Review|ពិនិត្យ
Add|បន្ថែម
Edit|កែប្រែ
Remove|ដកចេញ
Delete|លុប
Reason|មូលហេតុ
Before|មុន
After|ក្រោយ
Actor|អ្នកអនុវត្ត
Audit history|ប្រវត្តិសវនកម្ម
Open audit log|បើកកំណត់ហេតុសវនកម្ម
Export data snapshot|នាំចេញច្បាប់ចម្លងទិន្នន័យ
No records yet.|មិនទាន់មានទិន្នន័យ។
No matching records.|រកមិនឃើញទិន្នន័យត្រូវគ្នា។
No access|គ្មានសិទ្ធិ
None|គ្មាន
General|ទូទៅ
Employees|បុគ្គលិក
Employee|បុគ្គលិក
Employee ID|លេខសម្គាល់បុគ្គលិក
English name|ឈ្មោះជាភាសាអង់គ្លេស
Position|មុខតំណែង
Department|នាយកដ្ឋាន
Team|ក្រុម
Roles|តួនាទី
Permission profiles|ក្រុមសិទ្ធិប្រព័ន្ធ
Job functions|មុខងារការងារ
Add employee|បន្ថែមបុគ្គលិក
Save employee|រក្សាទុកបុគ្គលិក
Edit employee|កែប្រែបុគ្គលិក
Review status|ស្ថានភាពពិនិត្យ
Employment group|ប្រភេទបុគ្គលិក
Login account|គណនីចូលប្រព័ន្ធ
Approval grants|សិទ្ធិអនុម័ត
Edit organization details|កែប្រែព័ត៌មានអង្គភាព
Edit permission profiles|កែប្រែក្រុមសិទ្ធិ
Edit approval grants|កែប្រែសិទ្ធិអនុម័ត
Preview employee|សាកល្បងតួនាទីបុគ្គលិក
Source record|ទិន្នន័យប្រភព
Not provided|មិនបានផ្ដល់
Not provided in source|គ្មានក្នុងប្រភព
Unprovisioned|មិនទាន់បង្កើតគណនី
Provisioned|បានបង្កើតគណនី
No open flags|គ្មានសញ្ញាត្រូវពិនិត្យ
Role planning|ផែនការតួនាទី
Open Roles & PICs|បើកតួនាទី និងអ្នកទទួលបន្ទុក
Named employees|បុគ្គលិកមានឈ្មោះ
Assigned PIC|អ្នកទទួលបន្ទុកបានចាត់តាំង
Assign PIC|ចាត់តាំងអ្នកទទួលបន្ទុក
Role functions|មុខងារតួនាទី
Function requests|សំណើមុខងារ
Add function request|បន្ថែមសំណើមុខងារ
Priority|អាទិភាព
High|ខ្ពស់
Medium|មធ្យម
Low|ទាប
New|ថ្មី
Active|កំពុងដំណើរការ
Approved|បានអនុម័ត
Approved for Bid|បានអនុម័តឱ្យដេញថ្លៃ
Proceed to Bid|បន្តដេញថ្លៃ
Bid with Conditions|ដេញថ្លៃដោយមានលក្ខខណ្ឌ
Requires Management Review|ត្រូវការពិនិត្យដោយថ្នាក់គ្រប់គ្រង
Do Not Bid|មិនចូលដេញថ្លៃ
Rejected|បានបដិសេធ
Cancelled|បានលុបចោល
Closed|បានបិទ
Draft|ព្រាង
Internal Review|ពិនិត្យផ្ទៃក្នុង
Pending Review|រង់ចាំពិនិត្យ
Pending|កំពុងរង់ចាំ
Reviewed|បានពិនិត្យ
Under Evaluation|កំពុងវាយតម្លៃ
Estimating|កំពុងប៉ាន់ស្មាន
Submitted|បានបញ្ជូន
Sent|បានផ្ញើ
Received|បានទទួល
Partially Received|បានទទួលមួយផ្នែក
Ordered|បានបញ្ជាទិញ
Requested|បានស្នើសុំ
In Progress|កំពុងអនុវត្ត
Scheduled|បានកំណត់ពេល
Completed|បានបញ្ចប់
Awarded|បានទទួលគម្រោង
Accepted|បានយល់ព្រម
Lost|មិនឈ្នះ
Overdue|ហួសកំណត់
On Hold|ផ្អាក
Certified|បានបញ្ជាក់
Paid|បានទូទាត់
Disputed|មានវិវាទ
Usable|អាចប្រើប្រាស់បាន
Damaged|ខូចខាត
Invoice reference|ឯកសារយោងវិក្កយបត្រ
Invoice references|ឯកសារយោងវិក្កយបត្រ
Progress claim|សំណើទូទាត់តាមវឌ្ឍនភាព
Payment|ការទូទាត់
Payments|ការទូទាត់
Record payment|កត់ត្រាការទូទាត់
Collection|ការប្រមូលប្រាក់
Cash forecast|ព្យាករសាច់ប្រាក់
Receivables|ប្រាក់ត្រូវទទួល
Reporting currency|រូបិយប័ណ្ណរបាយការណ៍
Company and approval thresholds|ក្រុមហ៊ុន និងកម្រិតអនុម័ត
Edit settings|កែប្រែការកំណត់
Default tax|ពន្ធលំនាំដើម
Minimum margin|អត្រាចំណេញអប្បបរមា
Cash exposure limit|កម្រិតហានិភ័យសាច់ប្រាក់
Delegated purchase limit|កម្រិតសិទ្ធិអនុម័តទិញ
Price review interval|ចន្លោះពេលពិនិត្យតម្លៃ
Inventory aging|អាយុកាលស្តុក
Renewal alert|រំលឹកការបន្តកិច្ចសន្យា
FX effective date|ថ្ងៃអនុវត្តអត្រាប្ដូរប្រាក់
Employee access|សិទ្ធិបុគ្គលិក
Assign employee access|កំណត់សិទ្ធិបុគ្គលិក
Data imports|ការនាំចូលទិន្នន័យ
Import records|នាំចូលទិន្នន័យ
Source file|ឯកសារប្រភព
Rows|ចំនួនបន្ទាត់
Cutoff|ថ្ងៃកាត់គ្រា
Fictional demonstration|ការសាកល្បងទិន្នន័យគំរូ
Reset demo|កំណត់ទិន្នន័យគំរូឡើងវិញ
Compose|សរសេរអ៊ីមែល
Refresh|ផ្ទុកឡើងវិញ
Receive demo email|ទទួលអ៊ីមែលសាកល្បង
Client conversations and attachments linked to your project records.|ការឆ្លើយឆ្លងជាមួយអតិថិជន និងឯកសារភ្ជាប់តាមគម្រោង។
Public demo: Inbox, incoming mail and sending are simulated. Messages and files stay in this browser.|សាកល្បងសាធារណៈ៖ ការទទួល និងផ្ញើអ៊ីមែលជាការក្លែងធ្វើ។ អ៊ីមែល និងឯកសាររក្សាទុកក្នុងកម្មវិធីរុករកនេះ។
MAILBOX|ប្រអប់អ៊ីមែល
Mailbox|ប្រអប់អ៊ីមែល
Projects & Installation|គម្រោង និងការដំឡើង
Business & Support|អាជីវកម្ម និងការគាំទ្រ
Inbox|ប្រអប់សំបុត្រចូល
Starred|បានដាក់ផ្កាយ
Drafts|សេចក្ដីព្រាង
Archive|ទុកក្នុងបណ្ណសារ
Trash|ធុងសំរាម
TEAMS demo mailbox|ប្រអប់អ៊ីមែល TEAMS សាកល្បង
Search email|ស្វែងរកអ៊ីមែល
Your project conversations|ការឆ្លើយឆ្លងតាមគម្រោង
Select an email to read it, reply or review its project attachments.|ជ្រើសអ៊ីមែលដើម្បីអាន ឆ្លើយតប ឬមើលឯកសារភ្ជាប់។
Reply|ឆ្លើយតប
Reply all|ឆ្លើយតបទាំងអស់
Forward|បញ្ជូនបន្ត
Star|ដាក់ផ្កាយ
Unstar|ដកផ្កាយ
Mark unread|សម្គាល់មិនទាន់អាន
Restore|ស្ដារឡើងវិញ
Link record|ភ្ជាប់ទិន្នន័យ
New message|អ៊ីមែលថ្មី
Continue email draft|បន្តសេចក្ដីព្រាងអ៊ីមែល
Reply to client|ឆ្លើយតបអតិថិជន
Forward email|បញ្ជូនអ៊ីមែលបន្ត
From mailbox|ប្រអប់អ៊ីមែលអ្នកផ្ញើ
To|ជូន
Cc|ចម្លងជូន (Cc)
Bcc|ចម្លងសម្ងាត់ (Bcc)
Linked project or client record|គម្រោង ឬអតិថិជនពាក់ព័ន្ធ
Subject|ប្រធានបទ
Message formatting|ទម្រង់អត្ថបទ
Bold|អក្សរដិត
Italic|អក្សរទ្រេត
Underline|គូសបន្ទាត់ក្រោម
Bullet list|បញ្ជីចំណុច
Clear formatting|សម្អាតទម្រង់
List|បញ្ជី
Clear|សម្អាត
Email message|ខ្លឹមសារអ៊ីមែល
Choose an existing project file|ជ្រើសឯកសារគម្រោងដែលមាន
Existing project document|ឯកសារគម្រោងដែលមាន
Final client document|ឯកសារចុងក្រោយសម្រាប់អតិថិជន
Choose a final client PDF or Excel|ជ្រើស PDF ឬ Excel ចុងក្រោយសម្រាប់អតិថិជន
Attach client document|ភ្ជាប់ឯកសារអតិថិជន
Upload email attachments|ផ្ទុកឯកសារភ្ជាប់អ៊ីមែលឡើង
Up to 20 attachments, 10 MB total. Choose accessible project files or approved client exports.|អាចភ្ជាប់ដល់ 20 ឯកសារ សរុប 10 MB។ ជ្រើសឯកសារគម្រោងដែលមានសិទ្ធិ ឬឯកសារអតិថិជនបានអនុម័ត។
No attachments selected.|មិនទាន់ជ្រើសឯកសារភ្ជាប់។
Save draft|រក្សាទុកព្រាង
Send|ផ្ញើ
Demo compose. Sending is simulated; no message will leave this browser.|ការសរសេរអ៊ីមែលសាកល្បង។ ការផ្ញើជាការក្លែងធ្វើ អ៊ីមែលមិនចេញពីកម្មវិធីរុករកនេះទេ។
Simulated|ក្លែងធ្វើសាកល្បង
Provider accepted|អ្នកផ្ដល់សេវាបានទទួល
Delivered|បានបញ្ជូនដល់
Delivery unknown|មិនទាន់ដឹងលទ្ធផលបញ្ជូន
Provider rejected|អ្នកផ្ដល់សេវាបានបដិសេធ
Email draft saved.|បានរក្សាទុកព្រាងអ៊ីមែល។
Files attached to the draft.|បានភ្ជាប់ឯកសារទៅសេចក្ដីព្រាង។
Simulated incoming email received.|បានទទួលអ៊ីមែលក្លែងធ្វើសាកល្បង។
Demo email sent. No real email was transmitted.|បានផ្ញើអ៊ីមែលសាកល្បង។ មិនមានអ៊ីមែលពិតត្រូវបានផ្ញើទេ។
Interface language|ភាសាចំណុចប្រទាក់
Language|ភាសា
More|បន្ថែម
Work|ការងារ
Stock|ស្តុក
Menu|ម៉ឺនុយ
Install app|ដំឡើងកម្មវិធី
Install TEAMS|ដំឡើង TEAMS
Use TEAMS from your Home screen.|ប្រើ TEAMS ពីអេក្រង់ដើមរបស់អ្នក។
Android / Chrome|Android / Chrome
Tap Install app, then confirm the browser installation prompt. You can also use the browser menu and choose Install app or Add to Home screen.|ចុចដំឡើងកម្មវិធី រួចបញ្ជាក់តាមសារកម្មវិធីរុករក។ អ្នកក៏អាចប្រើម៉ឺនុយរុករក ហើយជ្រើស Install app ឬ Add to Home screen។
iPhone / iPad|iPhone / iPad
Open this address in Safari. Tap Share, choose Add to Home Screen, then Add.|បើកអាសយដ្ឋាននេះក្នុង Safari។ ចុច Share ជ្រើស Add to Home Screen រួចចុច Add។
Connection required|ត្រូវការអ៊ីនធឺណិត
Live records, approvals, stock updates and email require an internet connection. Nothing is queued for automatic submission.|ទិន្នន័យពិត ការអនុម័ត ការកែស្តុក និងអ៊ីមែលត្រូវការអ៊ីនធឺណិត។ គ្មានប្រតិបត្តិការត្រូវបានដាក់ជាជួរដើម្បីបញ្ជូនស្វ័យប្រវត្តិទេ។
Offline. Reconnect before submitting operational changes.|គ្មានអ៊ីនធឺណិត។ ភ្ជាប់ឡើងវិញមុនបញ្ជូនការផ្លាស់ប្ដូរប្រតិបត្តិការ។
Connection restored.|បានភ្ជាប់អ៊ីនធឺណិតឡើងវិញ។
App update available.|មានកំណែកម្មវិធីថ្មី។
Update app|ធ្វើបច្ចុប្បន្នភាពកម្មវិធី
Update and reload? Save or finish any open work first.|ធ្វើបច្ចុប្បន្នភាព និងផ្ទុកឡើងវិញ? សូមរក្សាទុក ឬបញ្ចប់ការងារដែលកំពុងបើកជាមុន។
Discard unsaved changes?|បោះបង់ការផ្លាស់ប្ដូរមិនទាន់រក្សាទុក?
Mobile app and languages|កម្មវិធីទូរស័ព្ទ និងភាសា
Use English or Khmer. Install the app on a phone for quick access in the field.|ប្រើភាសាអង់គ្លេស ឬខ្មែរ។ ដំឡើងកម្មវិធីលើទូរស័ព្ទដើម្បីប្រើរហ័សនៅទីតាំងការងារ។
Production readiness|ការត្រៀមដាក់ប្រើប្រាស់ពិត
Deployment requirements|តម្រូវការដាក់ប្រើប្រាស់
Public demo remains isolated. A separate authenticated environment and deployment checks are required for real operations.|ការសាកល្បងសាធារណៈនៅដាច់ដោយឡែក។ ការប្រើប្រាស់ពិតត្រូវការបរិស្ថានមានការផ្ទៀងផ្ទាត់គណនី និងការត្រួតពិនិត្យមុនដាក់ប្រើប្រាស់។
Official names, positions and entered data retain their original spelling. Client exports retain their approved document language.|ឈ្មោះផ្លូវការ មុខតំណែង និងទិន្នន័យបញ្ចូលរក្សាអក្ខរាវិរុទ្ធដើម។ ឯកសារអតិថិជនរក្សាភាសាឯកសារដែលបានអនុម័ត។
13-week cash forecast|ព្យាករសាច់ប្រាក់ 13 សប្ដាហ៍
Accounting reference|ឯកសារយោងគណនេយ្យ
Add a new person|បន្ថែមបុគ្គលថ្មី
Add person|បន្ថែមបុគ្គល
Add verified excerpts|បន្ថែមអត្ថបទបានផ្ទៀងផ្ទាត់
Agreement template review|ពិនិត្យគំរូកិច្ចព្រមព្រៀង
All profiles|ក្រុមសិទ្ធិទាំងអស់
Approved shortage|បរិមាណខ្វះបានអនុម័ត
Assign another person|ចាត់តាំងបុគ្គលផ្សេង
Authority reference|ឯកសារយោងសិទ្ធិអនុម័ត
Available functions|មុខងារអាចប្រើបាន
Awarded projects|គម្រោងបានទទួល
BOQ worksheet|សន្លឹកតារាងបរិមាណ
Barcode or QR value|តម្លៃបាកូដ ឬ QR
Base unit|ឯកតាគោល
Bill of quantities|តារាងបរិមាណការងារ
Billing|ការចេញវិក្កយបត្រ
Billing & collections|ការចេញវិក្កយបត្រ និងការប្រមូលប្រាក់
Billing milestones|ដំណាក់កាលទូទាត់
Camera scanning is unavailable in this browser. Search for the item code or use a keyboard scanner.|កម្មវិធីរុករកនេះមិនគាំទ្រស្កេនដោយកាមេរ៉ា។ ស្វែងរកលេខកូដ ឬប្រើឧបករណ៍ស្កេន។
Camera unavailable. Search by code or allow camera access and retry.|មិនអាចប្រើកាមេរ៉ា។ ស្វែងរកតាមលេខកូដ ឬអនុញ្ញាតកាមេរ៉ារួចសាកឡើងវិញ។
Candidate terms. Verify each against the PDF before adding it.|លក្ខខណ្ឌស្នើ។ ផ្ទៀងផ្ទាត់ជាមួយ PDF មុនបន្ថែម។
Carrying value|តម្លៃស្តុកតាមបញ្ជី
Certification or dispute reference|ឯកសារយោងបញ្ជាក់ ឬវិវាទ
Change history|ប្រវត្តិផ្លាស់ប្ដូរ
Claimed|បានស្នើទូទាត់
Client decision reference|ឯកសារយោងសេចក្ដីសម្រេចអតិថិជន
Client email connection|ការតភ្ជាប់អ៊ីមែលអតិថិជន
Client email history|ប្រវត្តិអ៊ីមែលអតិថិជន
Client party|ភាគីអតិថិជន
Client signatory|អ្នកចុះហត្ថលេខាអតិថិជន
Clients & projects|អតិថិជន និងគម្រោង
Closure reason|មូលហេតុបិទ
Condition|ស្ថានភាពសម្ភារៈ
Confirm selected lines|បញ្ជាក់បន្ទាត់បានជ្រើស
Continue draft|បន្តសេចក្ដីព្រាង
Contractor party|ភាគីអ្នកម៉ៅការ
Cost impact|ផលប៉ះពាល់ចំណាយ
Cost type|ប្រភេទចំណាយ
Coverage hours|ម៉ោងប្រចាំការ
Covered assets|ទ្រព្យសកម្មក្នុងវិសាលភាព
Created|បានបង្កើត
Criteria|លក្ខណៈវិនិច្ឆ័យ
Customer acknowledgment|ការបញ្ជាក់ទទួលរបស់អតិថិជន
Customer remarks|មតិអតិថិជន
Decision handoffs|ការប្រគល់បន្តសេចក្ដីសម្រេច
Decision rights|សិទ្ធិសម្រេច
Delivery location|ទីតាំងប្រគល់
Delivery proof|ភស្តុតាងប្រគល់
Demo only. No email was transmitted.|សាកល្បងប៉ុណ្ណោះ។ មិនមានអ៊ីមែលត្រូវបានផ្ញើ។
Demo roles|តួនាទីសាកល្បង
Document|ឯកសារ
Download attachment|ទាញយកឯកសារភ្ជាប់
Drafting checklist for review. Final wording, commercial limits and signatory authority must be agreed before use.|បញ្ជីសម្រាប់ពិនិត្យសេចក្ដីព្រាង។ ត្រូវឯកភាពខ្លឹមសារចុងក្រោយ កម្រិតពាណិជ្ជកម្ម និងសិទ្ធិចុះហត្ថលេខាមុនប្រើ។
Edit assignment|កែប្រែការចាត់តាំង
Edit profiles|កែប្រែក្រុមសិទ្ធិ
Employee assignments|ការចាត់តាំងបុគ្គលិក
Employee audit history|ប្រវត្តិសវនកម្មបុគ្គលិក
Employee changes|ការផ្លាស់ប្ដូរបុគ្គលិក
Employee directory|បញ្ជីបុគ្គលិក
Employees for role planning|បុគ្គលិកសម្រាប់ផែនការតួនាទី
Error|កំហុស
Evidence|ភស្តុតាង
Exceptions|បញ្ហាត្រូវពិនិត្យ
Exclusions|ការលើកលែង
Export employee plan|នាំចេញផែនការបុគ្គលិក
Export plan and history|នាំចេញផែនការ និងប្រវត្តិ
Export role plan|នាំចេញផែនការតួនាទី
File type|ប្រភេទឯកសារ
Filename|ឈ្មោះឯកសារ
Find terms in a searchable PDF|ស្វែងរកលក្ខខណ្ឌក្នុង PDF ដែលមានអត្ថបទ
Generate an editable draft using the tender BOQ and catalog prices. Review materials, quantities, labor and exclusions before approval.|បង្កើតព្រាងអាចកែប្រែពីតារាងបរិមាណដេញថ្លៃ និងតម្លៃកាតាឡុក។ ពិនិត្យសម្ភារៈ បរិមាណ ពលកម្ម និងការលើកលែងមុនអនុម័ត។
Goods receipts|ការទទួលទំនិញ
Gross profit|ប្រាក់ចំណេញដុល
HR & employees|ធនធានមនុស្ស និងបុគ្គលិក
Import tender material BOQ|នាំចូលតារាងបរិមាណសម្ភារៈដេញថ្លៃ
Import type|ប្រភេទនាំចូល
Installation project register|បញ្ជីគម្រោងដំឡើង
Invoice|វិក្កយបត្រ
Invoice amount|ទឹកប្រាក់វិក្កយបត្រ
Issue job materials|បញ្ចេញសម្ភារៈការងារ
Issue stock|បញ្ចេញស្តុក
Item|មុខទំនិញ
Items outside normal workflow.|ការងារខុសពីលំហូរធម្មតា។
Jobs and operations rounds|ការងារ និងវេនប្រតិបត្តិការ
KHR per USD|រៀលក្នុងមួយដុល្លារ
Latest change reference|ឯកសារយោងផ្លាស់ប្ដូរចុងក្រោយ
Load employee list|ផ្ទុកបញ្ជីបុគ្គលិក
Load provided employee JSON|ផ្ទុក JSON បុគ្គលិកដែលបានផ្ដល់
Load the full provided list|ផ្ទុកបញ្ជីពេញដែលបានផ្ដល់
Load the source JSON to include all 69 people in this browser.|ផ្ទុក JSON ប្រភពដើម្បីរួមបញ្ចូលបុគ្គលិក 69 នាក់ក្នុងកម្មវិធីរុករកនេះ។
Maintenance services|សេវាថែទាំ
Material catalog|កាតាឡុកសម្ភារៈ
Material prices|តម្លៃសម្ភារៈ
Materials requested|សម្ភារៈបានស្នើ
Monitor work, commitments and exceptions across TEAMS.|តាមដានការងារ កាតព្វកិច្ចចំណាយ និងបញ្ហាត្រូវពិនិត្យនៅ TEAMS។
Movement|ចលនាស្តុក
Names and official positions come from the source list. HR can record job functions and organizational corrections. Changes are saved in this browser.|ឈ្មោះ និងមុខតំណែងផ្លូវការយកពីបញ្ជីប្រភព។ HR អាចកត់ត្រាមុខងារការងារ និងកែព័ត៌មានអង្គភាព។ ការកែប្រែរក្សាទុកក្នុងកម្មវិធីរុករកនេះ។
New quotations|សម្រង់តម្លៃថ្មី
No items in this queue.|គ្មានការងារក្នុងបញ្ជីនេះ។
No matching terms were found. Review and enter the confirmed terms manually.|រកមិនឃើញលក្ខខណ្ឌត្រូវគ្នា។ ពិនិត្យ និងបញ្ចូលលក្ខខណ្ឌដែលបានបញ្ជាក់ដោយដៃ។
No messages|គ្មានអ៊ីមែល
No open purchase orders are available.|គ្មានបញ្ជាទិញកំពុងបើក។
No project record linked|មិនទាន់ភ្ជាប់គម្រោង
Open tenders|ការដេញថ្លៃកំពុងបើក
Operational billing|ការទូទាត់ប្រតិបត្តិការ
Other revisions|កំណែផ្សេង
Outstanding invoices|វិក្កយបត្រមិនទាន់ទូទាត់
Overdue collections|ការប្រមូលប្រាក់ហួសកំណត់
PIC & function requests|អ្នកទទួលបន្ទុក និងសំណើមុខងារ
PIC function requests|សំណើមុខងារអ្នកទទួលបន្ទុក
Payment history|ប្រវត្តិទូទាត់
Payments recorded|ការទូទាត់បានកត់ត្រា
People and proposed profiles|បុគ្គលិក និងក្រុមសិទ្ធិស្នើ
Permission profile|ក្រុមសិទ្ធិ
Planning history|ប្រវត្តិផែនការ
Position the item label inside the camera view.|ដាក់ស្លាកមុខទំនិញក្នុងផ្ទៃកាមេរ៉ា។
Price verification history|ប្រវត្តិផ្ទៀងផ្ទាត់តម្លៃ
Price verified on|ថ្ងៃផ្ទៀងផ្ទាត់តម្លៃ
Project operations|ប្រតិបត្តិការគម្រោង
Project performance|លទ្ធផលគម្រោង
Projected collections and commitments use record due dates. An opening cash entry dated today enables the running balance.|ការប្រមូលប្រាក់ និងកាតព្វកិច្ចចំណាយព្យាករប្រើថ្ងៃកំណត់ក្នុងទិន្នន័យ។ បញ្ចូលសាច់ប្រាក់ដើមគ្រាថ្ងៃនេះដើម្បីគណនាសមតុល្យបន្ត។
Proposed profile|ក្រុមសិទ្ធិស្នើ
Proposed role mappings|ការផ្គូផ្គងតួនាទីស្នើ
Provider reference|ឯកសារយោងអ្នកផ្ដល់សេវា
Purchase reason|មូលហេតុទិញ
Quotation generation record|កំណត់ត្រាបង្កើតសម្រង់តម្លៃ
Quotation register|បញ្ជីសម្រង់តម្លៃ
Quotations & estimates|សម្រង់តម្លៃ និងការប៉ាន់ស្មាន
Reading document text...|កំពុងអានអត្ថបទឯកសារ...
Reading spreadsheet...|កំពុងអានសៀវភៅបញ្ជី...
Reading the file...|កំពុងអានឯកសារ...
Receipt acknowledgment|ការបញ្ជាក់ទទួល
Receive materials|ទទួលសម្ភារៈ
Recent movements|ចលនាស្តុកថ្មីៗ
Record|ទិន្នន័យ
Record attachments|ឯកសារភ្ជាប់ទិន្នន័យ
Recorded collections|ប្រាក់ប្រមូលបានកត់ត្រា
Recorded material cost|ថ្លៃសម្ភារៈបានកត់ត្រា
Requested materials|សម្ភារៈបានស្នើ
Reset records to the original fictional dataset. Existing demonstration edits will be removed.|កំណត់ទិន្នន័យគំរូដូចដើម។ ការកែប្រែសាកល្បងដែលមាននឹងត្រូវលុប។
Resident technicians|អ្នកបច្ចេកទេសប្រចាំទីតាំង
Response and service terms|លក្ខខណ្ឌឆ្លើយតប និងសេវាកម្ម
Retention held|ប្រាក់កាត់ទុកធានា
Retry same send|សាកផ្ញើដដែលឡើងវិញ
Return to administrator|ត្រឡប់ទៅអ្នកគ្រប់គ្រង
Review PICs and function requests|ពិនិត្យអ្នកទទួលបន្ទុក និងសំណើមុខងារ
Review each material line to compare offers, authorize its shortage and create the purchase order.|ពិនិត្យសម្ភារៈតាមបន្ទាត់ ប្រៀបធៀបតម្លៃ អនុម័តបរិមាណខ្វះ និងបង្កើតបញ្ជាទិញ។
Review recorded employee changes and export job functions with the discussion plan.|ពិនិត្យការកែប្រែបុគ្គលិក និងនាំចេញមុខងារការងារជាមួយផែនការពិភាក្សា។
Review timestamped changes and approval actions.|ពិនិត្យការផ្លាស់ប្ដូរ និងការអនុម័តដែលមានពេលវេលាកត់ត្រា។
Role assignment audit|សវនកម្មចាត់តាំងតួនាទី
Role planning history|ប្រវត្តិផែនការតួនាទី
Rows committed|បន្ទាត់បានរក្សាទុក
Safety instructions|សេចក្ដីណែនាំសុវត្ថិភាព
Search names and positions|ស្វែងរកឈ្មោះ និងមុខតំណែង
See named source examples, propose PIC assignments and record the functions each role needs.|មើលឧទាហរណ៍ពីប្រភព ស្នើអ្នកទទួលបន្ទុក និងកត់ត្រាមុខងារចាំបាច់នៃតួនាទី។
Select a function to see its responsibilities and demo roles.|ជ្រើសមុខងារដើម្បីមើលការទទួលខុសត្រូវ និងតួនាទីសាកល្បង។
Select a service and follow the handoff from one team to the next.|ជ្រើសសេវាកម្ម និងតាមដានការប្រគល់ការងាររវាងក្រុម។
Select material|ជ្រើសសម្ភារៈ
Selling price before tax|តម្លៃលក់មុនពន្ធ
Service agreements|កិច្ចព្រមព្រៀងសេវាកម្ម
Service checklist|បញ្ជីត្រួតពិនិត្យសេវាកម្ម
Service contracts|កិច្ចសន្យាសេវាកម្ម
Service jobs and operations rounds|ការងារសេវាកម្ម និងវេនប្រតិបត្តិការ
Sign out|ចាកចេញពីគណនី
Simulation only. No email left this browser.|ក្លែងធ្វើប៉ុណ្ណោះ។ មិនមានអ៊ីមែលចេញពីកម្មវិធីរុករកនេះទេ។
Skip|រំលង
Staffing and relief plan|ផែនការបុគ្គលិក និងអ្នកជំនួស
Start common transactions.|ចាប់ផ្ដើមប្រតិបត្តិការញឹកញាប់។
Stock in|ស្តុកចូល
Supplier comparisons|ប្រៀបធៀបអ្នកផ្គត់ផ្គង់
Supplier return|ប្រគល់ត្រឡប់អ្នកផ្គត់ផ្គង់
TEAMS functions|មុខងារ TEAMS
TEAMS signatory|អ្នកចុះហត្ថលេខា TEAMS
Tax|ពន្ធ
Template review|ពិនិត្យគំរូឯកសារ
Tender materials need review|សម្ភារៈដេញថ្លៃត្រូវពិនិត្យ
Tender pipeline|បញ្ជីដំណើរការដេញថ្លៃ
Tenders & bidding|ការដេញថ្លៃ
Tenders received|ការដេញថ្លៃបានទទួល
Terms|លក្ខខណ្ឌ
The provider accepted this message. Client inbox delivery has not been confirmed.|អ្នកផ្ដល់សេវាបានទទួលអ៊ីមែលនេះ។ មិនទាន់បញ្ជាក់ថាដល់ប្រអប់អតិថិជន។
The provider accepted this message. Delivery is pending confirmation.|អ្នកផ្ដល់សេវាបានទទួលអ៊ីមែលនេះ។ កំពុងរង់ចាំបញ្ជាក់ការបញ្ជូនដល់។
The supplied source has no named example for this system role. Add a person when TEAMS identifies the PIC.|ប្រភពមិនមានឈ្មោះសម្រាប់តួនាទីនេះ។ បន្ថែមបុគ្គលនៅពេល TEAMS កំណត់អ្នកទទួលបន្ទុក។
This item exceeds the configured movement age. Review redistribution or disposal.|មុខទំនិញនេះលើសអាយុចលនាស្តុកដែលកំណត់។ ពិនិត្យការផ្ទេរប្រើ ឬការដកចេញ។
Time on job|ពេលវេលាធ្វើការ
Upcoming deadlines and records that need attention.|ថ្ងៃកំណត់ខាងមុខ និងការងារត្រូវយកចិត្តទុកដាក់។
Use Description, Quantity and Unit columns. The selected worksheet supplies the tender BOQ. Catalog prices are applied when the quotation is generated.|ប្រើជួរឈរពិពណ៌នា បរិមាណ និងឯកតា។ សន្លឹកបានជ្រើសជាប្រភព BOQ ដេញថ្លៃ។ តម្លៃកាតាឡុកអនុវត្តពេលបង្កើតសម្រង់តម្លៃ។
Use a PDF up to 10 MB.|ប្រើ PDF ទំហំមិនលើស 10 MB។
Variation value|តម្លៃការងារប្រែប្រួល
Variations|ការងារប្រែប្រួល
Verified cutoff|ថ្ងៃកាត់គ្រាបានផ្ទៀងផ្ទាត់
Verified price|តម្លៃបានផ្ទៀងផ្ទាត់
View accessible records and reports.|មើលទិន្នន័យ និងរបាយការណ៍ដែលមានសិទ្ធិ។
View all functions|មើលមុខងារទាំងអស់
View decision rights|មើលសិទ្ធិសម្រេច
View full work queue|មើលបញ្ជីការងារពេញ
Visits completed|ការចុះថែទាំបានបញ្ចប់
Warehouse balances|សមតុល្យឃ្លាំង
Weekly activity|សកម្មភាពប្រចាំសប្ដាហ៍
Work areas|ផ្នែកការងារ
Analyze tender|វិភាគការដេញថ្លៃ
Projects in delivery|គម្រោងកំពុងអនុវត្ត
Opportunities in the pipeline|ឱកាសកំពុងតាមដាន
Uncollected invoice balances|សមតុល្យវិក្កយបត្រមិនទាន់ប្រមូល
Past the payment due date|ហួសថ្ងៃកំណត់ទូទាត់
Commercial|ពាណិជ្ជកម្ម
Operations|ប្រតិបត្តិការ
Collections|ការប្រមូលប្រាក់
All clients|អតិថិជនទាំងអស់
Shared clients|អតិថិជនប្រើរួម
New maintenance client|អតិថិជនថែទាំថ្មី
One client profile can serve installation, maintenance or both teams.|ប្រវត្តិអតិថិជនមួយអាចប្រើសម្រាប់ការដំឡើង ការថែទាំ ឬក្រុមទាំងពីរ។
Approve the bid, then generate a quotation from its scope and material BOQ.|អនុម័តការដេញថ្លៃ រួចបង្កើតសម្រង់តម្លៃពីវិសាលភាព និងតារាងបរិមាណសម្ភារៈ។
Import a BOQ, verify costs, and approve the client quotation.|នាំចូលតារាងបរិមាណ ផ្ទៀងផ្ទាត់ចំណាយ និងអនុម័តសម្រង់តម្លៃអតិថិជន។
Search code or name|ស្វែងរកកូដ ឬឈ្មោះ
Required|ត្រូវបំពេញ
Optional|ជាជម្រើស
Saved.|បានរក្សាទុក។
Accounting invoice reference|ឯកសារយោងវិក្កយបត្រគណនេយ្យ
Amount received|ទឹកប្រាក់បានទទួល
Approved budget|ថវិកាបានអនុម័ត
Approved milestone, if applicable|ដំណាក់កាលបានអនុម័ត ប្រសិនបើពាក់ព័ន្ធ
Approved progress reference|ឯកសារយោងវឌ្ឍនភាពបានអនុម័ត
Asset register / covered equipment and locations|បញ្ជីទ្រព្យសកម្ម / ឧបករណ៍ និងទីតាំងក្នុងវិសាលភាព
Assigned roles|តួនាទីបានចាត់តាំង
Authorized decisions|សេចក្ដីសម្រេចដែលមានសិទ្ធិ
Bank or receipt reference|ឯកសារយោងធនាគារ ឬបង្កាន់ដៃ
Budget impact|ផលប៉ះពាល់ថវិកា
Cash collateral (% of guarantee)|ប្រាក់ដាក់ធានា (% នៃការធានា)
Cash date|ថ្ងៃកត់ត្រាសាច់ប្រាក់
Certified amount|ទឹកប្រាក់បានបញ្ជាក់
Charge to project|កត់ចំណាយទៅគម្រោង
Claim amount|ទឹកប្រាក់ស្នើទូទាត់
Claim title|ចំណងជើងសំណើទូទាត់
Claim value|តម្លៃស្នើទូទាត់
Client authorized signatory and position|អ្នកចុះហត្ថលេខាអតិថិជនមានសិទ្ធិ និងមុខតំណែង
Client legal entity and registered address|នីតិបុគ្គលអតិថិជន និងអាសយដ្ឋានចុះបញ្ជី
Company contact email|អ៊ីមែលទំនាក់ទំនងក្រុមហ៊ុន
Company name|ឈ្មោះក្រុមហ៊ុន
Completion (%)|វឌ្ឍនភាពបញ្ចប់ (%)
Completion or certification criteria|លក្ខខណ្ឌបញ្ចប់ ឬបញ្ជាក់ការងារ
Confirmed supplier offer|សំណើតម្លៃអ្នកផ្គត់ផ្គង់បានបញ្ជាក់
Contract reference|ឯកសារយោងកិច្ចសន្យា
Cost reference|ឯកសារយោងចំណាយ
Customer acknowledgment name|ឈ្មោះអតិថិជនបញ្ជាក់ទទួល
Customer advance (%)|ប្រាក់បង់មុនអតិថិជន (%)
Default tax (%)|ពន្ធលំនាំដើម (%)
Delivered quantity|បរិមាណបានប្រគល់
Delivery date|ថ្ងៃប្រគល់
Delivery proof reference|ឯកសារយោងភស្តុតាងប្រគល់
Demonstration role|តួនាទីសាកល្បង
Discussion note or reason for change|កំណត់សម្គាល់ពិភាក្សា ឬមូលហេតុកែប្រែ
Due date|ថ្ងៃកំណត់
Effective date|ថ្ងៃចាប់ផ្ដើមអនុវត្ត
Employee name|ឈ្មោះបុគ្គលិក
Entry reference|ឯកសារយោងកត់ត្រា
Entry type|ប្រភេទកត់ត្រា
Estimated project cost|ចំណាយគម្រោងប៉ាន់ស្មាន
Estimating hours|ម៉ោងប៉ាន់ស្មាន
Exchange rate effective date|ថ្ងៃអនុវត្តអត្រាប្ដូរប្រាក់
Expected claim date|ថ្ងៃរំពឹងស្នើទូទាត់
Expected delivery|ថ្ងៃរំពឹងប្រគល់
Expected result|លទ្ធផលរំពឹង
Findings and work completed|លទ្ធផលត្រួតពិនិត្យ និងការងារបានបញ្ចប់
Guarantee face value (% of contract)|តម្លៃលិខិតធានា (% នៃកិច្ចសន្យា)
Guarantee fees|កម្រៃធានា
Internal notes|កំណត់សម្គាល់ផ្ទៃក្នុង
Inventory aging threshold (days)|កម្រិតអាយុកាលស្តុក (ថ្ងៃ)
KHR per USD, for reference|រៀលក្នុងមួយដុល្លារ សម្រាប់យោង
Link to record|ភ្ជាប់ទៅទិន្នន័យ
Material code|លេខកូដសម្ភារៈ
Milestone name|ឈ្មោះដំណាក់កាលទូទាត់
Minimum gross margin (%)|អត្រាចំណេញដុលអប្បបរមា (%)
Minimum stock|ស្តុកអប្បបរមា
Minutes worked|នាទីបានធ្វើការ
Named representative|អ្នកតំណាងមានឈ្មោះ
Needed by|ត្រូវការត្រឹមថ្ងៃ
Offered unit price|តម្លៃឯកតាដែលស្នើ
Open purchase order|បញ្ជាទិញកំពុងបើក
Or expense category|ឬប្រភេទចំណាយ
Or maintenance visit|ឬការចុះថែទាំ
Original issue|ការបញ្ចេញដើម
PIC / requester|អ្នកទទួលបន្ទុក / អ្នកស្នើសុំ
Payment date|ថ្ងៃទូទាត់
Payment delay in months|រយៈពេលពន្យារទូទាត់ជាខែ
Payment due date|ថ្ងៃកំណត់ទូទាត់
Person from the employee list|បុគ្គលពីបញ្ជីបុគ្គលិក
Physical quantity|បរិមាណរាប់ជាក់ស្ដែង
Price verification age (days)|រយៈពេលផ្ទៀងផ្ទាត់តម្លៃ (ថ្ងៃ)
Price verification date|ថ្ងៃផ្ទៀងផ្ទាត់តម្លៃ
Primary contact|អ្នកទំនាក់ទំនងចម្បង
Product specifications|លក្ខណៈបច្ចេកទេសផលិតផល
Progress note|កំណត់សម្គាល់វឌ្ឍនភាព
Project months|រយៈពេលគម្រោងជាខែ
Project name|ឈ្មោះគម្រោង
Project, service contract or client|គម្រោង កិច្ចសន្យាសេវាកម្ម ឬអតិថិជន
Proposed permission profiles|ក្រុមសិទ្ធិស្នើ
Quotation indirect allowance|ចំណាយប្រយោលក្នុងសម្រង់តម្លៃ
Quotation payment terms|លក្ខខណ្ឌទូទាត់សម្រង់តម្លៃ
Quotation risk allowance|ប្រាក់បម្រុងហានិភ័យសម្រង់តម្លៃ
Quotation target margin (%)|អត្រាចំណេញគោលដៅសម្រង់តម្លៃ (%)
Quotation warranty|ការធានាក្នុងសម្រង់តម្លៃ
Reason for assignment or change|មូលហេតុចាត់តាំង ឬផ្លាស់ប្ដូរ
Reason for employee change|មូលហេតុកែប្រែបុគ្គលិក
Receipt acknowledgment reference|ឯកសារយោងបញ្ជាក់ទទួល
Received by|អ្នកទទួល
Record type|ប្រភេទទិន្នន័យ
Renewal alert lead time (days)|ចំនួនថ្ងៃរំលឹកមុនបន្តកិច្ចសន្យា
Requested contract value change|ការស្នើកែតម្លៃកិច្ចសន្យា
Requisition title|ចំណងជើងសំណើទិញ
Response, attendance, escalation and restoration terms|លក្ខខណ្ឌឆ្លើយតប ចុះទីតាំង បញ្ជូនបញ្ហាឡើង និងស្ដារប្រព័ន្ធ
Retention (%)|ប្រាក់កាត់ទុកធានា (%)
Service category|ប្រភេទសេវាកម្ម
Sign-in email|អ៊ីមែលចូលប្រព័ន្ធ
Signatory authority / delegation references|ឯកសារយោងសិទ្ធិចុះហត្ថលេខា / ការប្រគល់សិទ្ធិ
Site access, isolation and safety requirements|លក្ខខណ្ឌចូលទីតាំង ការផ្ដាច់ប្រព័ន្ធ និងសុវត្ថិភាព
Site location|ទីតាំងការងារ
Submission deadline|ថ្ងៃផុតកំណត់បញ្ជូន
Supplier delivery reference|ឯកសារយោងប្រគល់អ្នកផ្គត់ផ្គង់
Supplier name|ឈ្មោះអ្នកផ្គត់ផ្គង់
TEAMS authorized signatory and position|អ្នកចុះហត្ថលេខា TEAMS មានសិទ្ធិ និងមុខតំណែង
TEAMS legal entity and registered address|នីតិបុគ្គល TEAMS និងអាសយដ្ឋានចុះបញ្ជី
Task title|ចំណងជើងភារកិច្ច
Technician sign-in email|អ៊ីមែលចូលប្រព័ន្ធអ្នកបច្ចេកទេស
Tender title|ចំណងជើងដេញថ្លៃ
Total quantity to reserve|បរិមាណសរុបត្រូវបម្រុងទុក
Type RESET to confirm|វាយ RESET ដើម្បីបញ្ជាក់
Upfront materials and mobilization|សម្ភារៈដំបូង និងការត្រៀមចូលការដ្ឋាន
Variation title|ចំណងជើងការងារប្រែប្រួល
Verified commercial terms and source references|លក្ខខណ្ឌពាណិជ្ជកម្មបានផ្ទៀងផ្ទាត់ និងឯកសារយោង
Verified opening stock cutoff|ថ្ងៃកាត់គ្រាស្តុកដើមបានផ្ទៀងផ្ទាត់
Verified unit cost|ថ្លៃដើមឯកតាបានផ្ទៀងផ្ទាត់
Verified unit price|តម្លៃឯកតាបានផ្ទៀងផ្ទាត់
Visit date|ថ្ងៃចុះថែទាំ
Visit status|ស្ថានភាពចុះថែទាំ
Warehouse code|លេខកូដឃ្លាំង
Warehouse name|ឈ្មោះឃ្លាំង
Back to inbox|ត្រឡប់ទៅប្រអប់សំបុត្រ
One requisition with multiple material lines|សំណើទិញមួយអាចមានសម្ភារៈច្រើនបន្ទាត់
Create requisition|បង្កើតសំណើទិញ
Remove material line|លុបបន្ទាត់សម្ភារៈ
Design & assessment|រចនា និងវាយតម្លៃ
MEP contracting|ម៉ៅការងារ MEP
Maintenance & FM|ការថែទាំ និងគ្រប់គ្រងអគារ
Solar power|ថាមពលព្រះអាទិត្យ
Consultancy|ប្រឹក្សាយោបល់
Generator trading|ជួញដូរម៉ាស៊ីនភ្លើង
MEP Design & Assessment|រចនា និងវាយតម្លៃ MEP
MEP Contracting & Installation|ម៉ៅការ និងដំឡើង MEP
MEP O&M, Scheduled Maintenance & Troubleshooting|ប្រតិបត្តិការ MEP ថែទាំតាមកាលវិភាគ និងដោះស្រាយបញ្ហា
Solar Power Systems|ប្រព័ន្ធថាមពលព្រះអាទិត្យ
Consultancy & Project Management|ប្រឹក្សាយោបល់ និងគ្រប់គ្រងគម្រោង
Generator Trading|ជួញដូរម៉ាស៊ីនភ្លើង
Design, QS & Tendering|រចនា វាស់បរិមាណ និងដេញថ្លៃ
Design & QS Manager|អ្នកគ្រប់គ្រងរចនា និងវាស់បរិមាណ
Projects & Installation or Maintenance & FM|គម្រោង និងដំឡើង ឬការថែទាំ និងគ្រប់គ្រងអគារ
Qualify scope|ពិនិត្យវិសាលភាព
Assess systems|វាយតម្លៃប្រព័ន្ធ
Build BOQ|រៀបចំតារាងបរិមាណ
Technical review|ពិនិត្យបច្ចេកទេស
Qualify tender|ពិនិត្យការដេញថ្លៃ
Estimate & review|ប៉ាន់ស្មាន និងពិនិត្យ
Buy & issue|ទិញ និងបញ្ចេញសម្ភារៈ
Deliver works|អនុវត្តការងារ
Submit claim|បញ្ជូនសំណើទូទាត់
Review contract|ពិនិត្យកិច្ចសន្យា
Plan visit|រៀបផែនការចុះទីតាំង
Service equipment|ថែទាំឧបករណ៍
Prepare renewal|រៀបចំបន្តកិច្ចសន្យា
Review design|ពិនិត្យការរចនា
Source equipment|ស្វែងរកឧបករណ៍
Install & commission|ដំឡើង និងសាកល្បងដាក់ដំណើរការ
Hand over service|ប្រគល់បន្តសេវាកម្ម
Create service contract|បង្កើតកិច្ចសន្យាសេវាកម្ម
Agree brief|ឯកភាពលើតម្រូវការ
Assess & advise|វាយតម្លៃ និងផ្ដល់យោបល់
Track delivery|តាមដានការអនុវត្ត
Quote supply|សម្រង់តម្លៃផ្គត់ផ្គង់
Prepare purchase|រៀបចំការទិញ
Dispatch & confirm|ដឹកជញ្ជូន និងបញ្ជាក់ទទួល
Follow collection|តាមដានប្រមូលប្រាក់
Business & Commercial qualifies the request. Design & QS owns the technical package.|ផ្នែកអាជីវកម្ម និងពាណិជ្ជកម្មពិនិត្យសំណើ។ ផ្នែករចនា និងវាស់បរិមាណទទួលបន្ទុកកញ្ចប់បច្ចេកទេស។
Confirm the client brief, site requirements and bid deadline.|បញ្ជាក់តម្រូវការអតិថិជន តម្រូវការទីតាំង និងថ្ងៃផុតកំណត់ដេញថ្លៃ។
Record site findings and define mechanical, electrical, plumbing and fire protection scope.|កត់ត្រាលទ្ធផលត្រួតពិនិត្យទីតាំង និងកំណត់វិសាលភាពមេកានិច អគ្គិសនី ទឹក និងការពារអគ្គិភ័យ។
Measure quantities, compare costs and prepare the proposal for review.|វាស់បរិមាណ ប្រៀបធៀបចំណាយ និងរៀបចំសំណើសម្រាប់ពិនិត្យ។
Review the technical scope and assumptions before the package goes to Commercial.|ពិនិត្យវិសាលភាពបច្ចេកទេស និងការសន្មត មុនបញ្ជូនទៅផ្នែកពាណិជ្ជកម្ម។
Design & QS prepares the estimate. Projects & Installation owns delivery, with material and claim handoffs.|ផ្នែករចនា និងវាស់បរិមាណរៀបចំប៉ាន់ស្មាន។ ផ្នែកគម្រោង និងដំឡើងអនុវត្តការងារ ដោយប្រគល់បន្តសម្ភារៈ និងសំណើទូទាត់។
Screen scope, delivery commitments and commercial risk.|ពិនិត្យវិសាលភាព ការប្ដេជ្ញាអនុវត្ត និងហានិភ័យពាណិជ្ជកម្ម។
Price the BOQ and hand the scope and assumptions to the project team.|ដាក់តម្លៃតារាងបរិមាណ និងប្រគល់វិសាលភាព និងការសន្មតទៅក្រុមគម្រោង។
Prepare purchasing from the site requisition. Stock Control receives and issues materials.|រៀបចំការទិញតាមសំណើទីតាំង។ ផ្នែកត្រួតពិនិត្យស្តុកទទួល និងបញ្ចេញសម្ភារៈ។
Assign the site team and track installation, progress evidence and cost to complete.|ចាត់តាំងក្រុមទីតាំង និងតាមដានការដំឡើង ភស្តុតាងវឌ្ឍនភាព និងចំណាយដើម្បីបញ្ចប់។
Review the project claim, invoice certified work and track collection.|ពិនិត្យសំណើទូទាត់គម្រោង ចេញវិក្កយបត្រការងារបានបញ្ជាក់ និងតាមដានប្រមូលប្រាក់។
Choose onsite facility operations, scheduled maintenance with optional resident staff, or a one-time troubleshooting job. The signed service scope defines coverage and repair approvals.|ជ្រើសប្រតិបត្តិការអគារនៅទីតាំង ថែទាំតាមកាលវិភាគអាចមានបុគ្គលិកប្រចាំ ឬជួសជុលមួយលើក។ វិសាលភាពសេវាបានចុះហត្ថលេខាកំណត់ការគ្របដណ្ដប់ និងការអនុម័តជួសជុល។
Classify the service model and define covered assets, resident staffing, operating hours and planned visits.|កំណត់ទម្រង់សេវា ទ្រព្យសកម្មក្នុងវិសាលភាព បុគ្គលិកប្រចាំ ម៉ោងប្រតិបត្តិការ និងផែនការចុះទីតាំង។
Coordinate the scheduled visit and prepare work for the assigned team.|សម្របសម្រួលកាលវិភាគចុះទីតាំង និងរៀបចំការងារសម្រាប់ក្រុមបានចាត់តាំង។
Complete the equipment checklist and record findings and consumption.|បំពេញបញ្ជីត្រួតពិនិត្យឧបករណ៍ និងកត់ត្រាលទ្ធផល និងការប្រើប្រាស់សម្ភារៈ។
Review service records, agreement terms and renewals. Email approved client documents directly and keep correspondence linked to the service record.|ពិនិត្យប្រវត្តិសេវា លក្ខខណ្ឌ និងការបន្តកិច្ចសន្យា។ ផ្ញើឯកសារបានអនុម័តតាមអ៊ីមែល និងភ្ជាប់ការឆ្លើយឆ្លងទៅទិន្នន័យសេវា។
Design & QS provides the technical package. The signed contract determines the delivery owner.|ផ្នែករចនា និងវាស់បរិមាណផ្ដល់កញ្ចប់បច្ចេកទេស។ កិច្ចសន្យាបានចុះហត្ថលេខាកំណត់អ្នកទទួលបន្ទុកអនុវត្ត។
Check the proposed system, scope and pricing before handoff.|ពិនិត្យប្រព័ន្ធស្នើ វិសាលភាព និងតម្លៃមុនប្រគល់បន្ត។
Prepare purchasing and confirm equipment availability against the approved scope.|រៀបចំការទិញ និងបញ្ជាក់ភាពអាចរកបាននៃឧបករណ៍តាមវិសាលភាពបានអនុម័ត។
Track site delivery and confirm installation and commissioning milestones.|តាមដានការអនុវត្តទីតាំង និងបញ្ជាក់ដំណាក់កាលដំឡើង និងសាកល្បងដាក់ដំណើរការ។
Plan preventive service where the customer contract includes maintenance.|រៀបផែនការថែទាំបង្ការ នៅពេលកិច្ចសន្យាអតិថិជនមានការថែទាំ។
Commercial agrees the scope. Design & QS owns technical deliverables and reports progress against the assignment.|ផ្នែកពាណិជ្ជកម្មឯកភាពវិសាលភាព។ ផ្នែករចនា និងវាស់បរិមាណទទួលបន្ទុកលទ្ធផលបច្ចេកទេស និងរាយការណ៍វឌ្ឍនភាព។
Confirm the deliverables, client contact and scope of the engagement.|បញ្ជាក់លទ្ធផលត្រូវប្រគល់ អ្នកទំនាក់ទំនងអតិថិជន និងវិសាលភាពការងារ។
Prepare the assessment and costed technical recommendations.|រៀបចំការវាយតម្លៃ និងអនុសាសន៍បច្ចេកទេសមានការប៉ាន់ស្មានចំណាយ។
Record milestones, site observations and client handover.|កត់ត្រាដំណាក់កាល លទ្ធផលសង្កេតទីតាំង និងការប្រគល់អតិថិជន។
Commercial owns the customer quotation. Head of MEP reviews technical fit, and Procurement & Logistics owns fulfilment.|ផ្នែកពាណិជ្ជកម្មទទួលបន្ទុកសម្រង់តម្លៃអតិថិជន។ ប្រធាន MEP ពិនិត្យបច្ចេកទេស ហើយលទ្ធកម្ម និងភស្តុភារអនុវត្តការផ្គត់ផ្គង់។
Specify the generator and prepare the equipment quotation.|កំណត់លក្ខណៈម៉ាស៊ីនភ្លើង និងរៀបចំសម្រង់តម្លៃឧបករណ៍។
Confirm the supplier, commercial terms and purchase order.|បញ្ជាក់អ្នកផ្គត់ផ្គង់ លក្ខខណ្ឌពាណិជ្ជកម្ម និងបញ្ជាទិញ។
Track the assigned delivery and record proof of handover.|តាមដានការដឹកជញ្ជូនបានចាត់តាំង និងកត់ត្រាភស្តុតាងប្រគល់។
Review the customer account and payment position.|ពិនិត្យគណនីអតិថិជន និងស្ថានភាពទូទាត់។
Executive|ថ្នាក់ដឹកនាំ
Business & Commercial|អាជីវកម្ម និងពាណិជ្ជកម្ម
Finance & Accounting|ហិរញ្ញវត្ថុ និងគណនេយ្យ
Accounting Manager|អ្នកគ្រប់គ្រងគណនេយ្យ
People & Administration|ធនធានមនុស្ស និងរដ្ឋបាល
Senior HR & Admin Executive|មន្ត្រីជាន់ខ្ពស់ធនធានមនុស្ស និងរដ្ឋបាល
Engineering & Operations|វិស្វកម្ម និងប្រតិបត្តិការ
O&M Supervisor|អ្នកត្រួតពិនិត្យប្រតិបត្តិការ និងថែទាំ
Procurement, Stock Control and Logistics|លទ្ធកម្ម ត្រួតពិនិត្យស្តុក និងភស្តុភារ
Sets direction, approves delegation and handles high-risk or above-limit decisions.|កំណត់ទិសដៅ អនុម័តការប្រគល់សិទ្ធិ និងសម្រេចបញ្ហាហានិភ័យខ្ពស់ ឬលើសកម្រិត។
Qualifies opportunities, manages client and tender pipelines, handles contracting and coordinates renewals.|ពិនិត្យឱកាស គ្រប់គ្រងអតិថិជន និងការដេញថ្លៃ រៀបចំកិច្ចសន្យា និងសម្របសម្រួលការបន្ត។
Reviews budgets, certifies claims, reconciles payments and collections, and maintains the cash forecast.|ពិនិត្យថវិកា បញ្ជាក់សំណើទូទាត់ ផ្ទៀងផ្ទាត់ការទូទាត់ និងការប្រមូលប្រាក់ និងរៀបចំព្យាករសាច់ប្រាក់។
Maintains employee records, confirms reporting lines and coordinates attendance and personnel assignments.|រក្សាប្រវត្តិបុគ្គលិក បញ្ជាក់ខ្សែរបាយការណ៍ និងសម្របសម្រួលវត្តមាន និងការចាត់តាំង។
Owns technical oversight, delivery capacity, engineering standards and safety across service lines.|ទទួលបន្ទុកត្រួតពិនិត្យបច្ចេកទេស សមត្ថភាពអនុវត្ត ស្តង់ដារវិស្វកម្ម និងសុវត្ថិភាពតាមសេវាកម្ម។
Leads assessment, design, quantities, cost estimates and technical tender review.|ដឹកនាំការវាយតម្លៃ រចនា វាស់បរិមាណ ប៉ាន់ស្មានចំណាយ និងពិនិត្យបច្ចេកទេសដេញថ្លៃ។
Owns installation delivery, crew assignments, site evidence, cost to complete and progress claim preparation.|ទទួលបន្ទុកដំឡើង ចាត់តាំងក្រុម ភស្តុតាងទីតាំង ចំណាយដើម្បីបញ្ចប់ និងរៀបចំសំណើទូទាត់តាមវឌ្ឍនភាព។
Plans contract visits, schedules technicians, reviews service records and manages maintenance cost.|រៀបចំផែនការចុះថែទាំ កំណត់កាលវិភាគបច្ចេកទេស ពិនិត្យប្រវត្តិសេវា និងគ្រប់គ្រងចំណាយថែទាំ។
Prepares purchases, maintains independent stock custody and coordinates dispatch and proof of delivery.|រៀបចំការទិញ រក្សាស្តុកដោយមានការត្រួតពិនិត្យឯករាជ្យ និងសម្របសម្រួលដឹកជញ្ជូន និងភស្តុតាងប្រគល់។
Proposed November 2026 operating model|គំរូប្រតិបត្តិការស្នើ ខែវិច្ឆិកា 2026
Use verified unit prices to build estimates and client quotations.|ប្រើតម្លៃឯកតាបានផ្ទៀងផ្ទាត់ដើម្បីប៉ាន់ស្មាន និងរៀបចំសម្រង់តម្លៃអតិថិជន។
Review stock shortages, compare suppliers and track deliveries.|ពិនិត្យស្តុកខ្វះ ប្រៀបធៀបអ្នកផ្គត់ផ្គង់ និងតាមដានការប្រគល់។
Record stock movements and see available quantities by location.|កត់ត្រាចលនាស្តុក និងមើលបរិមាណអាចប្រើបានតាមទីតាំង។
Monitor progress, material consumption, commitments and costs to complete.|តាមដានវឌ្ឍនភាព ការប្រើសម្ភារៈ កាតព្វកិច្ចចំណាយ និងចំណាយដើម្បីបញ្ចប់។
Manage facility operations, planned maintenance and one-time troubleshooting.|គ្រប់គ្រងប្រតិបត្តិការអគារ ការថែទាំតាមផែនការ និងជួសជុលមួយលើក។
Track progress claims, invoice references, payments and retention.|តាមដានសំណើទូទាត់តាមវឌ្ឍនភាព ឯកសារយោងវិក្កយបត្រ ការទូទាត់ និងប្រាក់កាត់ទុកធានា។
Review the weekly operating position and a rolling 13-week cash forecast.|ពិនិត្យស្ថានភាពប្រតិបត្តិការប្រចាំសប្ដាហ៍ និងព្យាករសាច់ប្រាក់ 13 សប្ដាហ៍បន្តបន្ទាប់។
Find evidence and attachments linked to operational records.|ស្វែងរកភស្តុតាង និងឯកសារភ្ជាប់ទៅទិន្នន័យប្រតិបត្តិការ។
Configure company details, thresholds, warehouses and access.|កំណត់ព័ត៌មានក្រុមហ៊ុន កម្រិតអនុម័ត ឃ្លាំង និងសិទ្ធិ។
Named representatives for the TEAMS requirements discussion.|អ្នកតំណាងមានឈ្មោះសម្រាប់ពិភាក្សាតម្រូវការ TEAMS។
Connect each permission profile to named people and discuss what they need from TEAMS Operations.|ភ្ជាប់ក្រុមសិទ្ធិនីមួយៗទៅបុគ្គលមានឈ្មោះ និងពិភាក្សាតម្រូវការពី TEAMS Operations។
Private employee directory|បញ្ជីបុគ្គលិកឯកជន
Permission profiles and approval grants|ក្រុមសិទ្ធិ និងសិទ្ធិអនុម័ត
Maintain employee positions, departments, teams and job functions for the demonstration.|គ្រប់គ្រងមុខតំណែង នាយកដ្ឋាន ក្រុម និងមុខងារបុគ្គលិកសម្រាប់ការសាកល្បង។
Record saved.|បានរក្សាទុកទិន្នន័យ។
No messages match your search.|គ្មានអ៊ីមែលត្រូវនឹងការស្វែងរក។
Messages in this folder will appear here.|អ៊ីមែលក្នុងថតនេះនឹងបង្ហាញនៅទីនេះ។
Untitled draft|ព្រាងមិនទាន់មានចំណងជើង
No recipient|មិនទាន់មានអ្នកទទួល
No message yet|មិនទាន់មានខ្លឹមសារ
Demo sent|បានផ្ញើសាកល្បង
Save changes|រក្សាទុកការផ្លាស់ប្ដូរ
Required date|ថ្ងៃត្រូវការ
Shortage|បរិមាណខ្វះ
Review needed|ត្រូវពិនិត្យ
Accountable|អ្នកទទួលខុសត្រូវចុងក្រោយ
Responsible|អ្នកអនុវត្ត
Consulted|អ្នកផ្ដល់យោបល់
Decision|សេចក្ដីសម្រេច
Function|មុខងារ
Reports to|រាយការណ៍ជូន
Responsibilities|ការទទួលខុសត្រូវ
Approval authority|សិទ្ធិអនុម័ត
Key indicators|សូចនាករចម្បង
TEAMS services|សេវាកម្ម TEAMS
Workflow stages|ដំណាក់កាលការងារ
Regular|បុគ្គលិកធម្មតា
Intern|អ្នកហាត់ការ
Yes|បាទ/ចាស
No|ទេ
Approve this revision before sending the final client document.|អនុម័តកំណែនេះមុនផ្ញើឯកសារចុងក្រោយជូនអតិថិជន។
Approved client documents are final exports. Attach the PDF or Excel directly in the email composer.|ឯកសារអតិថិជនបានអនុម័តជាឯកសារចុងក្រោយ។ ភ្ជាប់ PDF ឬ Excel ដោយផ្ទាល់ក្នុងអ៊ីមែល។
Select a material and enter a positive quantity.|ជ្រើសសម្ភារៈ និងបញ្ចូលបរិមាណលើសសូន្យ។
A requisition supports up to 100 materials.|សំណើទិញមួយអាចមានសម្ភារៈដល់ 100 មុខ។
A quotation supports up to 350 lines.|សម្រង់តម្លៃមួយអាចមានដល់ 350 បន្ទាត់។
Verify this material price or record current price evidence before saving.|ផ្ទៀងផ្ទាត់តម្លៃសម្ភារៈនេះ ឬកត់ត្រាភស្តុតាងតម្លៃបច្ចុប្បន្នមុនរក្សាទុក។
Sample rate recorded for this quotation line.|បានកត់ត្រាតម្លៃគំរូសម្រាប់បន្ទាត់សម្រង់តម្លៃនេះ។
Acknowledge delivery|បញ្ជាក់ទទួលការប្រគល់
Add forecast input|បន្ថែមទិន្នន័យព្យាករ
Add item|បន្ថែមមុខទំនិញ
Add supplier offer|បន្ថែមសំណើតម្លៃអ្នកផ្គត់ផ្គង់
Approve adjustment|អនុម័តការកែស្តុក
Assign delivery|ចាត់តាំងការដឹកជញ្ជូន
Assign or reschedule|ចាត់តាំង ឬកែពេលវេលា
Close order|បិទបញ្ជាទិញ
Create awarded project|បង្កើតគម្រោងបានទទួល
Create revision|បង្កើតកំណែថ្មី
Cycle count|រាប់ស្តុកតាមវដ្ដ
Edit access|កែប្រែសិទ្ធិ
Edit agreement|កែប្រែកិច្ចព្រមព្រៀង
Filter code or material|ច្រោះលេខកូដ ឬសម្ភារៈ
Find material, code or specification|ស្វែងរកសម្ភារៈ លេខកូដ ឬលក្ខណៈបច្ចេកទេស
Generate purchase order|បង្កើតបញ្ជាទិញ
Name or official position|ឈ្មោះ ឬមុខតំណែងផ្លូវការ
Name, ID or position|ឈ្មោះ លេខសម្គាល់ ឬមុខតំណែង
Prepare agreement / revision|រៀបចំកិច្ចព្រមព្រៀង / កំណែថ្មី
Record invoice reference|កត់ត្រាឯកសារយោងវិក្កយបត្រ
Record proof of delivery|កត់ត្រាភស្តុតាងប្រគល់
Reserve stock|បម្រុងស្តុក
Reverse|កត់ត្រាបញ្ច្រាស
Search employees and job functions|ស្វែងរកបុគ្គលិក និងមុខងារការងារ
Search this folder|ស្វែងរកក្នុងថតនេះ
Update job card|កែប្រែប័ណ្ណការងារ
Upload document|ផ្ទុកឯកសារឡើង
Use in quotation|ប្រើក្នុងសម្រង់តម្លៃ
Verify new price|ផ្ទៀងផ្ទាត់តម្លៃថ្មី
Export movements|នាំចេញចលនាស្តុក
Settings sections|ផ្នែកការកំណត់
Department not provided|មិនបានផ្ដល់នាយកដ្ឋាន
Team not provided|មិនបានផ្ដល់ក្រុម
Department to confirm|នាយកដ្ឋានត្រូវបញ្ជាក់
Team to confirm|ក្រុមត្រូវបញ្ជាក់
PIC to confirm|អ្នកទទួលបន្ទុកត្រូវបញ្ជាក់
Source imported in this browser|បាននាំចូលប្រភពក្នុងកម្មវិធីរុករកនេះ
Source example / proposed profile|ឧទាហរណ៍ប្រភព / ក្រុមសិទ្ធិស្នើ
Proposed in this browser|បានស្នើក្នុងកម្មវិធីរុករកនេះ
Connection unavailable. Reconnect, refresh the record and retry. There is no automatic offline resubmission.|មិនអាចភ្ជាប់បាន។ ភ្ជាប់ឡើងវិញ ផ្ទុកទិន្នន័យចុងក្រោយ និងសាកម្ដងទៀត។ គ្មានការបញ្ជូនប្រតិបត្តិការក្រៅបណ្ដាញឡើងវិញស្វ័យប្រវត្តិទេ។
Switch demonstration role|ប្ដូរតួនាទីសាកល្បង
Choose a role or named PIC. The demo opens that role's work area.|ជ្រើសតួនាទី ឬអ្នកទទួលបន្ទុកមានឈ្មោះ។ ប្រព័ន្ធនឹងបើកផ្នែកការងាររបស់តួនាទីនោះ។
Find a role or employee|ស្វែងរកតួនាទី ឬបុគ្គលិក
Search roles or employee names|ស្វែងរកតួនាទី ឬឈ្មោះបុគ្គលិក
No matching roles or employees.|រកមិនឃើញតួនាទី ឬបុគ្គលិកត្រូវគ្នា។
Switching role...|កំពុងប្ដូរតួនាទី...
Current role|តួនាទីកំពុងប្រើ
Switch|ប្ដូរ
This demonstration role is unavailable. Refresh and choose a listed role.|មិនអាចប្រើតួនាទីសាកល្បងនេះបាន។ ផ្ទុកឡើងវិញ និងជ្រើសតួនាទីក្នុងបញ្ជី។
The requested role was not applied. Your current role is unchanged.|មិនបានប្ដូរទៅតួនាទីដែលស្នើ។ តួនាទីបច្ចុប្បន្ននៅដដែល។
`;
export const khmer = Object.freeze(Object.fromEntries(entries.trim().split('\n').map(line => {const split=line.indexOf('|');return [line.slice(0,split),line.slice(split+1)];})));
let language='en';
try{language=localStorage.getItem('teams-language')||((navigator.languages||[]).some(x=>x.startsWith('km'))?'km':'en');}catch{}
if(!['en','km'].includes(language))language='en';
export const getLanguage=()=>language;
export function translate(value,lang=language){
  const text=String(value??'');if(lang!=='km')return text;
  const trimmed=text.trim(),direct=khmer[trimmed];
  if(direct)return text.replace(trimmed,direct);
  // Composed interface labels retain their numbers and identifiers.
  for(const [pattern,build]of [
    [/^(\d+) material lines?$/,m=>m[1]+' បន្ទាត់សម្ភារៈ'],
    [/^(\d+) open$/,m=>m[1]+' កំពុងបើក'],
    [/^(\d+) attachments?$/,m=>m[1]+' ឯកសារភ្ជាប់'],
    [/^Select (.+)$/,m=>{const key=Object.keys(khmer).find(x=>x.toLowerCase()===m[1]);return key?'ជ្រើស '+khmer[key]:text;}],
    [/^(Filter) (.+)$/,m=>khmer[m[2]]?'ច្រោះ '+khmer[m[2]]:text],
    [/^(Remove line|Remove material line|Remove attachment|Use sample price for line) (\d+)$/,m=>(khmer[m[1]]||({'Remove attachment':'ដកឯកសារភ្ជាប់','Use sample price for line':'ប្រើតម្លៃគំរូសម្រាប់បន្ទាត់'})[m[1]])+' '+m[2]],
    [/^(.+) line (\d+)$/,m=>khmer[m[1]]?khmer[m[1]]+' បន្ទាត់ '+m[2]:text],
    [/^(Inbox|Starred|Sent|Drafts|Archive|Trash|Attachments)\s*\((\d+)\)$/,m=>khmer[m[1]]+' ('+m[2]+')'],
    [/^(Switch to|Open) (.+)$/,m=>{const key=Object.keys(khmer).find(x=>x.toLowerCase()===m[2].toLowerCase());return key?(m[1]==='Open'?'បើក ':'ប្ដូរទៅ ')+khmer[key]:text;}],
  ]){const match=trimmed.match(pattern);if(match)return build(match);}
  // Translate fixed interface fragments without changing names or identifiers.
  if(trimmed.includes(' / ')){const parts=trimmed.split(' / ');if(parts.every(part=>khmer[part]))return parts.map(part=>khmer[part]).join(' / ');}
  return text;
}
const originalText=new WeakMap(),originalAttributes=new WeakMap();
const protectedSelector='script,style,textarea,[contenteditable],svg,[data-no-translate],.primary-cell,.profile .name,.planning-person strong,.job-functions,#search-results,.mail-body,.mail-message,.mail-list-subject,.mail-list-preview,.mail-sender,.mail-context .chip';
function translateText(node){
  if(node.parentElement?.closest(protectedSelector))return;
  let saved=originalText.get(node);
  if(!saved||node.nodeValue!==saved.output)saved={source:node.nodeValue};
  const output=translate(saved.source);if(node.nodeValue!==output)node.nodeValue=output;
  saved.output=output;originalText.set(node,saved);
}
export function translateInterface(root=document.body){
  if(!root)return;
  if(root.nodeType===3){translateText(root);return;}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode()))translateText(node);
  if(root.querySelectorAll)for(const table of [root,...root.querySelectorAll('table')].filter(el=>el.tagName==='TABLE')){
    const headers=[...table.querySelectorAll('thead th')].map(th=>originalText.get(th.firstChild)?.source||th.textContent);
    for(const row of table.querySelectorAll('tbody tr'))[...row.children].forEach((cell,i)=>{if(!cell.hasAttribute('data-label'))cell.setAttribute('data-label',headers[i]||'');});
  }
  const elements=root.querySelectorAll? [root,...root.querySelectorAll('[aria-label],[placeholder],[title],[data-label]')]:[];
  for(const el of elements){if(!el.getAttribute||el.closest(protectedSelector))continue;let saved=originalAttributes.get(el)||{};
    for(const attr of ['aria-label','placeholder','title','data-label']){if(!el.hasAttribute(attr))continue;const value=el.getAttribute(attr);let entry=saved[attr];if(!entry||entry.output!==value)entry={source:value};entry.output=translate(entry.source);if(value!==entry.output)el.setAttribute(attr,entry.output);saved[attr]=entry;}
    originalAttributes.set(el,saved);
  }
}
let observer=null,initialized=false;
const watch=()=>observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','data-label']});
function syncLanguageControls(){
  document.querySelectorAll('[data-language-picker]').forEach(el=>el.value=language);
  document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===language)));
  document.querySelectorAll('[data-language-control]').forEach(el=>el.setAttribute('aria-label',translate('Interface language')));
}
export function languageControl(){
  return '<div class="language-switch" role="group" aria-label="Interface language" data-language-control data-no-translate><button type="button" data-language="en" lang="en" aria-label="English" aria-pressed="'+(language==='en')+'">EN</button><button type="button" data-language="km" lang="km" aria-label="ភាសាខ្មែរ" aria-pressed="'+(language==='km')+'">ខ្មែរ</button></div>';
}
export function setLanguage(value,{persist=true}={}){
  if(!['en','km'].includes(value))return;
  // Keep translation writes out of the observer's queue and translate the whole
  // current document, including content added immediately before the selection.
  observer?.disconnect();
  try{
    language=value;if(persist)try{localStorage.setItem('teams-language',value);}catch{}
    document.documentElement.lang=value;translateInterface();syncLanguageControls();
    document.dispatchEvent(new CustomEvent('teams:language',{detail:value}));
  }finally{watch();}
}
export function initLocalization(){
  if(initialized)return;initialized=true;
  document.documentElement.lang=language;translateInterface();syncLanguageControls();
  observer=new MutationObserver(changes=>{
    observer.disconnect();
    try{for(const change of changes){if(change.type==='characterData'||change.type==='attributes')translateInterface(change.target);else for(const added of change.addedNodes)translateInterface(added);}}
    finally{watch();}
  });watch();
  // Explicit buttons avoid native select menus being replaced by a background
  // view refresh. Capture also works inside dialogs and nested form controls.
  document.addEventListener('click',event=>{
    const control=event.target.closest?.('[data-language]');
    if(!control||!['en','km'].includes(control.dataset.language))return;
    event.preventDefault();event.stopPropagation();setLanguage(control.dataset.language);
  },true);
  const legacyChange=event=>{if(event.target.matches?.('[data-language-picker]'))setLanguage(event.target.value);};
  document.addEventListener('input',legacyChange,true);document.addEventListener('change',legacyChange,true);
  const followSavedLanguage=()=>{try{const saved=localStorage.getItem('teams-language');if(['en','km'].includes(saved)&&saved!==language)setLanguage(saved,{persist:false});}catch{}};
  window.addEventListener('storage',event=>{if(event.key==='teams-language')followSavedLanguage();});
  window.addEventListener('pageshow',followSavedLanguage);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)followSavedLanguage();});
}
