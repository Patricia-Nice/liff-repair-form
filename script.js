// === กำหนดค่า LIFF และ GAS Web App URL ===
const LIFF_ID = '2007632351-g9D1mP18'; // เช่น '200xxxxxxx-xxxxxx'
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyuM0Y2x2I1X6xA4iqsWl9H7FJ9lXAwmg4Wc97aHE4h2OapJQwhzf5ngH-uPrR-Urss/exec';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('repairForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('statusMessage');
    const imageUploadInput = document.getElementById('imageUpload');

    // === เริ่มต้น LIFF ===
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            if (!liff.isLoggedIn()) {
                liff.login();
            }
        })
        .catch((err) => {
            console.error('LIFF init failed:', err);
            statusMessage.textContent = `⚠️ เกิดข้อผิดพลาดในการโหลด LIFF: ${err.message}`;
            statusMessage.className = 'status error';
            submitBtn.disabled = true;
        });

    // === เมื่อผู้ใช้กด Submit ===
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        submitBtn.disabled = true;
        statusMessage.textContent = '📤 กำลังส่งข้อมูล...';
        statusMessage.className = 'status loading';

        const room = document.getElementById('room').value.trim();
        const issueType = document.getElementById('issueType').value.trim();
        const description = document.getElementById('description').value.trim();
        const imageFile = imageUploadInput.files[0];

        if (!room || !issueType || !description) {
            statusMessage.textContent = '❗ กรุณากรอกข้อมูลห้อง, ประเภทปัญหา และรายละเอียดให้ครบถ้วน';
            statusMessage.className = 'status error';
            submitBtn.disabled = false;
            return;
        }

        try {
            const profile = await liff.getProfile();
            const liffUserId = profile.userId;

            let imageDataUrl = '';
            if (imageFile) {
                statusMessage.textContent = '📷 กำลังอัปโหลดรูปภาพ...';
                imageDataUrl = await readFileAsDataURL(imageFile);
            }

            const dataToSend = {
                room: room,
                issueType: issueType,
                description: description,
                imageURL: imageDataUrl,
                liffUserId: liffUserId
            };

            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                statusMessage.textContent = result.message;
                statusMessage.className = 'status success';
                form.reset();
                imageUploadInput.value = '';

                if (liff.isInClient()) {
                    liff.closeWindow();
                }
            } else {
                statusMessage.textContent = `❗ ระบบตอบกลับ: ${result.message}`;
                statusMessage.className = 'status error';
            }

        } catch (error) {
            console.error('📛 Form submission error:', error);
            statusMessage.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
            statusMessage.className = 'status error';
        } finally {
            submitBtn.disabled = false;
        }
    });

    // === Helper: แปลงรูปเป็น base64 ===
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
});
