// ** แทนที่ด้วย LIFF ID ของคุณที่ได้จาก LINE Developers Console **
const LIFF_ID = '2007632351-g9D1mP18'; 
// ** แทนที่ด้วย Web app URL ของ Google Apps Script ที่คุณ Deploy ไว้ **
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyZmPelue23w3yZvZoKx0LQlWI9uFbsjzkXpGg72rCysz3T3qr76a8xSP4-110Jm1ms/exec'; 

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('repairForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('statusMessage');

    // 1. Initialize LIFF
    liff.init({
        liffId: LIFF_ID
    })
    .then(() => {
        console.log('LIFF initialized');
        if (!liff.isLoggedIn()) {
            liff.login(); // Force login if not logged in
        }
        // Optional: Populate room number if available from LINE profile (e.g., if you store it in LINE profile)
        // Or get userId for later use
    })
    .catch((err) => {
        console.error('LIFF initialization failed', err);
        statusMessage.textContent = 'เกิดข้อผิดพลาดในการโหลด LIFF: ' + err.message;
        statusMessage.className = 'status error';
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        submitBtn.disabled = true;
        statusMessage.textContent = 'กำลังส่งข้อมูล...';
        statusMessage.className = 'status loading';

        // Get form data
        const room = document.getElementById('room').value;
        const issueType = document.getElementById('issueType').value;
        const description = document.getElementById('description').value;
        const imageFile = document.getElementById('imageUpload').files[0];

        let imageDataUrl = '';

        const sendDataToGAS = (imgUrl = '') => {
            // Get LIFF user ID
            liff.getProfile()
            .then(profile => {
                const liffUserId = profile.userId;

                const dataToSend = {
                    room: room,
                    issueType: issueType,
                    description: description,
                    imageURL: imgUrl, // Will be empty string if no image or upload failed
                    liffUserId: liffUserId // Send LIFF user ID to GAS
                };

                // Send data to Google Apps Script
                fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dataToSend)
                })
                .then(response => response.json())
                .then(result => {
                    if (result.status === 'success') {
                        statusMessage.textContent = result.message;
                        statusMessage.className = 'status success';
                        form.reset(); // Clear form after successful submission
                        // Close LIFF window if submission is successful
                        if (liff.isInClient()) {
                            liff.closeWindow();
                        }
                    } else {
                        statusMessage.textContent = result.message;
                        statusMessage.className = 'status error';
                    }
                })
                .catch(error => {
                    console.error('Error sending data to GAS:', error);
                    statusMessage.textContent = 'เกิดข้อผิดพลาดในการส่งข้อมูล: ' + error.message;
                    statusMessage.className = 'status error';
                })
                .finally(() => {
                    submitBtn.disabled = false;
                });
            })
            .catch(err => {
                console.error('Error getting LIFF profile:', err);
                statusMessage.textContent = 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้: ' + err.message;
                statusMessage.className = 'status error';
                submitBtn.disabled = false;
            });
        };

        // Handle image upload if a file is selected
        if (imageFile) {
            const reader = new FileReader();
            reader.onloadend = function() {
                // This is a base64 encoded string of the image.
                // IMPORTANT: Directly sending base64 to Google Sheet is NOT recommended for large images.
                // For a robust solution, you would upload this base64 to a cloud storage (e.g., Google Drive via another GAS function, or Cloudinary)
                // and get a publicly accessible URL, then send that URL to GAS.
                // For this basic example, we'll just send the base64 string, but it might hit URL limits if too large.
                // A better approach would be to have a separate GAS function to receive base64, save to Drive, and return URL.
                imageDataUrl = reader.result; 
                alert('Note: Image will be sent as Base64. For production, consider uploading to cloud storage first.'); // Acknowledge limitation
                sendDataToGAS(imageDataUrl); // Send data with base64 image
            };
            reader.onerror = function(error) {
                console.error("Error reading file:", error);
                statusMessage.textContent = 'เกิดข้อผิดพลาดในการอ่านรูปภาพ';
                statusMessage.className = 'status error';
                submitBtn.disabled = false;
            };
            reader.readAsDataURL(imageFile); // Read file as Data URL (base64)
        } else {
            sendDataToGAS(); // Send data without image
        }
    });
});
