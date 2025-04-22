
const emotionColors = {
    'joy': '#10b981',
    'fear': '#ef4444',
    'anger': '#ef4444',
    'disgust': '#8b5cf6',
    'sadness': '#3b82f6',
    'surprise': '#f59e0b',
    'neutral': '#9ca3af'
};

const emojis = {
            "anger": '<img src="emojis/angry.svg" alt="Anger" class="emoji-img">',
            "disgust": '<img src="emojis/disgusted.svg" alt="Disgust" class="emoji-img">',
            "fear": '<img src="emojis/fear.svg" alt="Fear" class="emoji-img">',
            "joy": '<img src="emojis/smile.svg" alt="Joy" class="emoji-img">',
            "neutral": '<img src="emojis/neutral.svg" alt="Neutral" class="emoji-img">',
            "sadness": '<img src="emojis/crying.svg" alt="Sadness" class="emoji-img">',
            "surprise": '<img src="emojis/surprised.svg" alt="Surprise" class="emoji-img">'
        };

let emotionChart = null;
let typingTimer;
const doneTypingInterval = 700;


document.getElementById('inputText').addEventListener('input', function() {
    
    const rephrasedText = document.getElementById('rephrasedText');
    rephrasedText.textContent = '';
    rephrasedText.classList.add('hidden');
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(analyzeEmotion, doneTypingInterval);
});


document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loading').style.display = 'block';
    document.getElementById('analyzed-text').innerHTML = '';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8080/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data); 

        if (Array.isArray(data)) {
            displayAnalyzedText(data);
        } else {
            throw new Error('Received data is not in the expected format');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('analyzed-text').innerHTML =
            `<div class="text-red-500">Error processing file: ${error.message}</div>`;
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
});

function toggleDropdown() {
    document.getElementById('emotionDropdown').classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.button')) {
        const dropdowns = document.getElementsByClassName('dropdown-content');
        for (const dropdown of dropdowns) {
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
    }
}

document.querySelectorAll('#emotionDropdown a').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const emotion = this.getAttribute('data-emotion');
        const text = document.getElementById('inputText').value;

        if (!text) {
            alert('Please enter text first');
            return;
        }

        fetch('http://localhost:8080/rephrase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, emotion })
        })
            .then(response => response.json())
            .then(data => {
                if (data.rephrased_text) {
                    const rephrasedText = document.getElementById('rephrasedText');
                    rephrasedText.textContent = data.rephrased_text;
                    rephrasedText.classList.remove('hidden');
                    analyzeEmotion(data.rephrased_text);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error rephrasing text');
            });

        toggleDropdown();
    });
});


function updateInputGlow(emotion = null, percentage = 0) {
    const inputField = document.getElementById('inputText');
    const dominantEmotionRow = document.querySelector('.highlight');
    
    inputField.classList.remove('input-field-glow');
    document.querySelectorAll('.emotion-row').forEach(row => {
        row.classList.remove('emotion-row-glow');
    });
    
    if (!emotion) {
        inputField.style.removeProperty('--glow-color');
        return;
    }
    
    const colorMap = {
        'joy': '16, 185, 129',      
        'fear': '239, 68, 68',      
        'anger': '239, 68, 68',     
        'disgust': '139, 92, 246',  
        'sadness': '59, 130, 246',  
        'surprise': '245, 158, 11', 
        'neutral': '156, 163, 175'  
    };
    
    const rgbColor = colorMap[emotion.toLowerCase()];
    if (rgbColor) {
        inputField.style.setProperty('--glow-color', rgbColor);
        inputField.classList.add('input-field-glow');
        
        if (percentage > 50 && dominantEmotionRow) {
            dominantEmotionRow.style.setProperty('--glow-color', rgbColor);
            dominantEmotionRow.classList.add('emotion-row-glow');
        }
    }
}

function analyzeEmotion(rephrasedText = null) {
    const text = rephrasedText || document.getElementById('inputText').value;

    if (!text) {
        updateInputGlow();
        return;
    }

    fetch('http://localhost:8080/predict_emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
        .then(response => response.json())
        .then(data => {
            let resultHTML = '';
            let emotions = [];
            let percentages = [];
            
            const dominantEmotion = Object.entries(data).reduce((a, b) => 
                a[1] > b[1] ? a : b);

            updateInputGlow(dominantEmotion[0], dominantEmotion[1]);

            for (const [emotion, percentage] of Object.entries(data)) {
                const emoji = emojis[emotion] || "❓";
                const isHighest = percentage === Math.max(...Object.values(data));
                resultHTML += `
                    <div class="emotion-row ${isHighest ? 'highlight' : ''}">
                        <span class="emoji">${emoji}</span>
                        <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${percentage.toFixed(1)}%</span>
                    </div>`;
                emotions.push(emotion.charAt(0).toUpperCase() + emotion.slice(1));
                percentages.push(percentage);
            }

            document.getElementById('result').innerHTML = resultHTML;
            updatePieChart(emotions, percentages);
        })
        .catch(error => {
            document.getElementById('result').innerHTML = '<span style="color:#ef4444;">Error analyzing emotion.</span>';
            console.error('Error:', error);
        });
}


function updatePieChart(emotions, percentages) {
    if (!emotionChart) {
        const ctx = document.getElementById('emotionChart').getContext('2d');
        emotionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: emotions,
                datasets: [{
                    data: percentages,
                    backgroundColor: ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#9ca3af', '#ec4899', '#8b5cf6'],
                    borderColor: '#2d2d2d',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e5e5e5',
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(tooltipItem) {
                                return `${tooltipItem.label}: ${tooltipItem.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    } else {
        emotionChart.data.labels = emotions;
        emotionChart.data.datasets[0].data = percentages;
        emotionChart.update({
            duration: 1000,
            easing: 'easeInOutQuart'
        });
    }
}

function displayAnalyzedText(textList) {
    const container = document.getElementById('analyzed-text');
    container.innerHTML = '';

    if (textList.length === 0) {
        container.innerHTML = '<p class="text-gray-400">No text found to analyze.</p>';
        return;
    }

    textList.forEach((item) => {
        const text = Object.keys(item)[0];
        const emotion = item[text];

        const textBlock = document.createElement('div');
        textBlock.className = 'text-block mb-4';

        const emoji = emojis[emotion.toLowerCase()] || '❓';
        const emotionColor = emotionColors[emotion.toLowerCase()] || '#9ca3af';

        textBlock.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <p class="text-lg">${text}</p>
                </div>
                <div class="flex items-center ml-4">
                    <span class="text-2xl mr-2">${emoji}</span>
                    <span class="emotion-tag" style="background-color: ${emotionColor}20; color: ${emotionColor}">
                        ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </span>
                </div>
            </div>`;

        container.appendChild(textBlock);
    });
}
