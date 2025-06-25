// ** แทนที่ด้วย LIFF ID ของคุณที่ได้จาก LINE Developers Console **
const LIFF_ID = '2007632351-g9D1mP18'; // ตัวอย่าง: '200xxxxxxx-xxxxxxxx'
// ** แทนที่ด้วย Web app URL ของ Google Apps Script ที่คุณ Deploy ไว้ **
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbygmKATUe7SCnQltLLI-WtgRwFfLvTvSQEUzqOPoR8hcMTHep6KhXEFfgANm8S0j6nb/exec'; // ตัวอย่าง: 'https://script.google.com/macros/s/AKfycbxxxxxxx/exec'

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('repairForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('statusMessage');
    const imageUploadInput = document.getElementById('imageUpload'); // อ้างอิงถึง input file

    // 1. Initialize LIFF
    liff.init({
        liffId: LIFF_ID
    })
    .then(() => {
        console.log('LIFF initialized successfully.');
        if (!liff.isLoggedIn()) {
            liff.login(); // Force login if not logged in
        } else {
            // LIFF พร้อมใช้งานแล้ว
            // สามารถเพิ่มโค้ดที่ต้องการรันหลังจาก LIFF init และ login สำเร็จที่นี่ได้
        }
    })
    .catch((err) => {
        console.error('LIFF initialization failed:', err);
        statusMessage.textContent = `เกิดข้อผิดพลาดในการโหลด LIFF: ${err.message}. กรุณาลองใหม่ในภายหลัง.`;
        statusMessage.className = 'status error';
        submitBtn.disabled = true; // ปิดปุ่มหาก LIFF มีปัญหา
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // ป้องกันการ Submit ฟอร์มแบบปกติ

        submitBtn.disabled = true;
        statusMessage.textContent = 'กำลังส่งข้อมูล...';
        statusMessage.className = 'status loading';

        // ดึงข้อมูลจากฟอร์ม
        const room = document.getElementById('room').value.trim();
        const issueType = document.getElementById('issueType').value.trim();
        const description = document.getElementById('description').value.trim();
        const imageFile = imageUploadInput.files[0];

        // ตรวจสอบข้อมูลเบื้องต้น
        if (!room || !issueType || !description) {
            statusMessage.textContent = 'กรุณากรอกข้อมูลห้อง, ประเภทปัญหา และรายละเอียดให้ครบถ้วน';
            statusMessage.className = 'status error';
            submitBtn.disabled = false;
            return; // หยุดการทำงาน
        }

        try {
            // ดึง LIFF user ID
            const profile = await liff.getProfile();
            const liffUserId = profile.userId;

            let imageDataUrl = ''; // สำหรับเก็บ Base64 ของรูปภาพ

            // จัดการอัปโหลดรูปภาพ (ถ้ามี)
            if (imageFile) {
                statusMessage.textContent = 'กำลังอัปโหลดรูปภาพ...';
                statusMessage.className = 'status loading';
                imageDataUrl = await readFileAsDataURL(imageFile);
                // ในอนาคต, ควรส่ง Base64 นี้ไปยัง GAS อีกฟังก์ชัน เพื่ออัปโหลดขึ้น Google Drive หรือ Cloud Storage อื่นๆ
                // แล้วส่ง URL ที่ได้กลับมาแทน Base64 เพื่อลดภาระของ Google Sheet
                console.warn('Note: Image is sent as Base64. For production, consider using a dedicated image upload service or Google Drive API.');
            }

            const dataToSend = {
                room: room,
                issueType: issueType,
                description: description,
                imageURL: imageDataUrl, // จะเป็น Base64 หรือ String ว่าง
                liffUserId: liffUserId
            };

            // ส่งข้อมูลไปยัง Google Apps Script
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend)
            });

            // ตรวจสอบสถานะ HTTP response
            if (!response.ok) {
                // หากเซิร์ฟเวอร์ตอบกลับมาด้วยสถานะ HTTP error (เช่น 404, 500)
                const errorBody = await response.text(); // อ่าน response body เพื่อดูรายละเอียด error
                throw new Error(`HTTP error! Status: ${response.status}. Details: ${errorBody}`);
            }

            const result = await response.json(); // แปลง response เป็น JSON

            // จัดการการตอบกลับจาก GAS (success/error message)
            if (result.status === 'success') {
                statusMessage.textContent = result.message;
                statusMessage.className = 'status success';
                form.reset(); // ล้างฟอร์ม
                // ล้างไฟล์ที่เลือกใน input type="file"
                imageUploadInput.value = ''; 
                // ปิด LIFF window หากอยู่ใน LINE
                if (liff.isInClient()) {
                    liff.closeWindow();
                }
            } else {
                // กรณีที่ GAS ประมวลผลแต่มี error กลับมา
                statusMessage.textContent = `เกิดข้อผิดพลาดจากระบบ: ${result.message}`;
                statusMessage.className = 'status error';
            }

        } catch (error) {
            // จัดการข้อผิดพลาดที่เกิดขึ้นระหว่าง fetch (เช่น Network error, CORS, JSON parse error)
            console.error('Error during form submission:', error);
            statusMessage.textContent = `เกิดข้อผิดพลาดในการส่งข้อมูล: ${error.message}. กรุณาลองใหม่อีกครั้ง.`;
            statusMessage.className = 'status error';
        } finally {
            submitBtn.disabled = false; // เปิดปุ่ม Submit กลับคืน
        }
    });

    // Helper function สำหรับอ่านไฟล์รูปภาพเป็น Base64
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
});
