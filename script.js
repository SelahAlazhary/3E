// التحقق من وجود Firebase
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded');
    alert('حدث خطأ في تحميل النظام. يرجى تحديث الصفحة.');
}

const firebaseConfig = {
    apiKey: "AIzaSyA9QBYL8jlupqXK22TuJqMgKmNRoKsSixM",
    authDomain: "hodor-d0034.firebaseapp.com",
    databaseURL: "https://hodor-d0034-default-rtdb.firebaseio.com",
    projectId: "hodor-d0034",
    storageBucket: "hodor-d0034.firebasestorage.app",
    messagingSenderId: "90162176907",
    appId: "1:90162176907:web:d50c12d8700166648f458e"
};

let app, database;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
} catch (error) {
    console.error('Firebase initialization error:', error);
}

let currentQuestionIndex = 0, score = 0, questions = [], userAnswers = [];
let selectedYear = '', selectedSection = '', selectedSubject = '', selectedLesson = '', selectedSublesson = '';
let sections = [], subjects = [], lessons = [], sublessons = [];
let quizStartTime = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let currentAd = null;
let loadingTimer = null;
const QUESTIONS_CACHE_KEY = 'azharQuestionsCache';

const elements = {
    quizContainer: document.getElementById('quiz-container'),
    questionContainer: document.getElementById('question-container'),
    resultsContainer: document.getElementById('results-container'),
    nextBtn: document.getElementById('next-btn'),
    prevBtn: document.getElementById('prev-btn'),
    submitBtn: document.getElementById('submit-btn'),
    restartBtn: document.getElementById('restart-btn'),
    quizTitle: document.getElementById('quiz-title'),
    scoreDisplay: document.getElementById('score-value'),
    percentageDisplay: document.getElementById('percentage'),
    timeTakenDisplay: document.getElementById('time-taken'),
    feedbackDisplay: document.getElementById('feedback'),
    logoContainer: document.getElementById('logo-container'),
    yearSelectionContainer: document.getElementById('year-selection-container'),
    sectionSelectionContainer: document.getElementById('section-selection-container'),
    subjectSelectionContainer: document.getElementById('subject-selection-container'),
    subjectSelectionTitle: document.getElementById('subject-selection-title'),
    subjectSelectionYear: document.getElementById('subject-selection-year'),
    subjectSelectionLogo: document.getElementById('subject-selection-logo'),
    lessonSelectionContainer: document.getElementById('lesson-selection-container'),
    sublessonSelectionContainer: document.getElementById('sublesson-selection-container'),
    yearCards: document.querySelectorAll('.year-card'),
    headerBackBtn: document.getElementById('header-back-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    sectionContainer: document.getElementById('section-container'),
    subjectContainer: document.getElementById('subject-container'),
    lessonContainer: document.getElementById('lesson-container'),
    sublessonContainer: document.getElementById('sublesson-container'),
    adContainer: document.getElementById('ad-container'),
    adClose: document.getElementById('ad-close'),
    adTitle: document.getElementById('ad-title'),
    adDescription: document.getElementById('ad-description'),
    adAction: document.getElementById('ad-action'),
    quizLoading: document.getElementById('quiz-loading'),
    currentQNum: document.getElementById('current-q-num'),
    totalQNum: document.getElementById('total-q-num')
};

// دالة عرض إشعار منبثق
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// دالة نسخ الرابط المحسنة (تعمل في كل الأحوال)
async function copySectionLink(sectionId, sectionName) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('section', sectionId);
    const shareUrl = currentUrl.toString();

    // محاولة 1: استخدام Clipboard API الحديث
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast(`تم نسخ رابط قسم "${sectionName}" بنجاح!`);
            return;
        } catch (err) {
            console.warn('Clipboard API failed:', err);
        }
    }

    // محاولة 2: الطريقة القديمة (execCommand)
    try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
            showToast(`تم نسخ رابط قسم "${sectionName}" بنجاح!`);
            return;
        }
    } catch (err) {
        console.warn('execCommand failed:', err);
    }

    // محاولة 3: عرض نافذة منبثقة يدوية (الخيار الأخير)
    showManualCopyDialog(shareUrl, sectionName);
}

// عرض نافذة منبثقة للنسخ اليدوي
function showManualCopyDialog(url, sectionName) {
    // إزالة أي نافذة موجودة مسبقاً
    const existingModal = document.querySelector('.copy-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'copy-modal';
    modal.innerHTML = `
        <div class="copy-modal-content">
            <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: var(--warning); margin-bottom: 15px; display: block;"></i>
            <h3 style="margin-bottom: 10px;">تعذر النسخ التلقائي</h3>
            <p style="margin-bottom: 15px; color: var(--text-secondary);">الرجاء نسخ الرابط يدوياً من الأسفل</p>
            <input type="text" id="manual-copy-input" value="${url}" readonly>
            <div class="copy-modal-buttons">
                <button class="copy-confirm-btn" id="manual-copy-confirm"><i class="fas fa-copy"></i> نسخ</button>
                <button class="copy-close-btn" id="manual-copy-close"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const input = modal.querySelector('#manual-copy-input');
    const confirmBtn = modal.querySelector('#manual-copy-confirm');
    const closeBtn = modal.querySelector('#manual-copy-close');

    // تحديد النص تلقائياً
    input.select();
    input.setSelectionRange(0, 99999);

    confirmBtn.addEventListener('click', () => {
        input.select();
        input.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        if (success) {
            showToast(`تم نسخ رابط قسم "${sectionName}" بنجاح!`);
            modal.remove();
        } else {
            showToast('فشل النسخ، يرجى تحديد النص ونسخه يدوياً', true);
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    // إغلاق عند الضغط خارج النافذة
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// دالة التحقق من وجود رابط قسم في URL
function checkForSectionLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const sectionId = urlParams.get('section');

    if (sectionId && database) {
        // جلب بيانات القسم من Firebase
        database.ref(`sections/${sectionId}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const section = snapshot.val();
                // التحقق من وجود سنة دراسية مرتبطة بالقسم
                if (section.grades && section.grades.length > 0) {
                    selectedYear = section.grades[0];
                    selectedSection = sectionId;
                    // إخفاء جميع الحاويات
                    elements.yearSelectionContainer.style.display = 'none';
                    elements.sectionSelectionContainer.style.display = 'none';
                    elements.subjectSelectionContainer.style.display = 'none';
                    elements.lessonSelectionContainer.style.display = 'none';
                    elements.sublessonSelectionContainer.style.display = 'none';
                    // تحميل المواد الخاصة بالقسم مباشرة
                    loadSubjectsForSection(selectedSection);
                    showToast(`تم التوجيه إلى قسم ${section.name || ''}`);
                } else {
                    showToast('القسم المطلوب غير متوفر حالياً', true);
                }
            } else {
                showToast('القسم المطلوب غير موجود', true);
            }
        }).catch(error => {
            console.error('خطأ في جلب بيانات القسم:', error);
            showToast('حدث خطأ في تحميل القسم المطلوب', true);
        });
        return true;
    }
    return false;
}

function getYearText(year) {
    const years = { prep1: 'الصف الأول الإعدادي', prep2: 'الصف الثاني الإعدادي', prep3: 'الصف الثالث الإعدادي' };
    return years[year] || '';
}

function showLoading(show) {
    if (elements.quizLoading) {
        elements.quizLoading.style.display = show ? 'flex' : 'none';
    }
}

function loadData() {
    if (!database) {
        console.error('Database not initialized');
        return;
    }

    database.ref('sections').once('value', (snapshot) => {
        sections = [];
        snapshot.forEach(child => { sections.push({ id: child.key, ...child.val() }); });
        // بعد تحميل الأقسام، التحقق من رابط القسم
        checkForSectionLink();
    }).catch(error => console.error('Error loading sections:', error));

    database.ref('subjects').once('value', (snapshot) => {
        subjects = [];
        snapshot.forEach(child => { subjects.push({ id: child.key, ...child.val() }); });
    }).catch(error => console.error('Error loading subjects:', error));

    database.ref('lessons').once('value', (snapshot) => {
        lessons = [];
        snapshot.forEach(child => { lessons.push({ id: child.key, ...child.val() }); });
    }).catch(error => console.error('Error loading lessons:', error));

    database.ref('sublessons').once('value', (snapshot) => {
        sublessons = [];
        snapshot.forEach(child => { sublessons.push({ id: child.key, ...child.val() }); });
    }).catch(error => console.error('Error loading sublessons:', error));

    database.ref('ads').once('value', (snapshot) => {
        if (snapshot.exists()) {
            currentAd = snapshot.val();
            displayAd();
        }
    }).catch(error => console.error('Error loading ads:', error));
}

function displayAd() {
    if (currentAd && currentAd.status === 'active' && elements.adContainer) {
        elements.adTitle.textContent = currentAd.title || 'إعلان';
        elements.adDescription.textContent = currentAd.description || '';
        elements.adContainer.style.display = 'block';
    }
}

function loadSectionsForYear(year) {
    if (!elements.sectionContainer) return;
    elements.sectionContainer.innerHTML = '';
    const yearSections = sections.filter(s => s.grades && s.grades.includes(year));
    if (yearSections.length === 0) {
        elements.sectionContainer.innerHTML = `<div class="no-questions"><i class="fas fa-info-circle"></i><h3>لا توجد أقسام متاحة</h3></div>`;
        return;
    }
    yearSections.forEach(section => {
        const card = document.createElement('div');
        card.className = 'section-card';
        card.dataset.section = section.id;
        card.innerHTML = `
            <i class="${section.icon || 'fa-folder'}"></i>
            <h3>${section.name || ''}</h3>
            <p>${section.description || ''}</p>
            <button class="copy-link-btn" data-section-id="${section.id}" data-section-name="${section.name || ''}">
                <i class="fas fa-share-alt"></i> نسخ رابط القسم
            </button>
        `;

        // إضافة حدث للنقر على البطاقة (باستثناء زر النسخ)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.copy-link-btn')) {
                selectedSection = section.id;
                loadSubjectsForSection(selectedSection);
            }
        });

        // إضافة حدث لزر نسخ الرابط
        const copyBtn = card.querySelector('.copy-link-btn');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copySectionLink(section.id, section.name);
        });

        elements.sectionContainer.appendChild(card);
    });
    elements.yearSelectionContainer.style.display = 'none';
    elements.sectionSelectionContainer.style.display = 'block';
    elements.headerBackBtn.style.display = 'flex';
    elements.quizTitle.textContent = `اختبار سلاح الأزهري - ${getYearText(selectedYear)}`;
}

function loadSubjectsForSection(sectionId) {
    if (!elements.subjectContainer) return;
    elements.subjectContainer.innerHTML = '';
    const sectionSubjects = subjects.filter(s => s.sectionId === sectionId);
    if (sectionSubjects.length === 0) {
        elements.subjectContainer.innerHTML = `<div class="no-questions"><i class="fas fa-info-circle"></i><h3>لا توجد مواد متاحة</h3></div>`;
        return;
    }
    const section = sections.find(sec => sec.id === sectionId) || {};
    const yearName = getYearText(selectedYear);
    if (elements.subjectSelectionTitle) {
        elements.subjectSelectionTitle.textContent = section.name || 'القسم الرئيسي';
    }
    if (elements.subjectSelectionYear) {
        elements.subjectSelectionYear.textContent = yearName || 'اسم الفصل الدراسي';
    }
    if (elements.subjectSelectionLogo) {
        elements.subjectSelectionLogo.alt = section.name || 'Logo';
        elements.subjectSelectionLogo.src = elements.logoContainer ? elements.logoContainer.querySelector('img')?.src || elements.subjectSelectionLogo.src : elements.subjectSelectionLogo.src;
    }
    sectionSubjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        card.dataset.subject = subject.id;
        card.innerHTML = `<i class="fas ${subject.icon || 'fa-book'}"></i><h3>${subject.name || ''}</h3><p>${subject.description || ''}</p>`;
        card.addEventListener('click', () => { selectedSubject = subject.id; loadLessonsForSubject(selectedSubject); });
        elements.subjectContainer.appendChild(card);
    });
    elements.sectionSelectionContainer.style.display = 'none';
    elements.subjectSelectionContainer.style.display = 'block';
    elements.headerBackBtn.style.display = 'flex';
}

function loadLessonsForSubject(subjectId) {
    if (!elements.lessonContainer) return;
    elements.lessonContainer.innerHTML = '';
    const subjectLessons = lessons.filter(l => l.subjectId === subjectId).sort((a,b) => (a.order||999) - (b.order||999));
    if (subjectLessons.length === 0) {
        setTimeout(() => {
            elements.subjectSelectionContainer.style.display = 'none';
            elements.quizContainer.style.display = 'block';
            loadQuestions();
        }, 500);
        return;
    }
    subjectLessons.forEach((lesson, index) => {
        const card = document.createElement('div');
        card.className = 'lesson-card';
        card.dataset.lesson = lesson.id;
        card.innerHTML = `
            <div class="lesson-icon"><i class="fas ${lesson.icon || 'fa-book-open'}"></i></div>
            <div class="lesson-content">
                <h3>${lesson.name || ''}</h3>
                <p>${lesson.description || 'اختبارات متنوعة لهذا الدرس'}</p>
            </div>
            <div class="lesson-number">${String(index + 1).padStart(2, '0')}</div>
            <div class="lesson-arrow"><i class="fas fa-chevron-left"></i></div>
        `;
        card.addEventListener('click', () => { selectedLesson = lesson.id; loadSublessonsForLesson(selectedLesson); });
        elements.lessonContainer.appendChild(card);
    });
    elements.subjectSelectionContainer.style.display = 'none';
    elements.lessonSelectionContainer.style.display = 'block';
    elements.headerBackBtn.style.display = 'flex';
}

function loadSublessonsForLesson(lessonId) {
    if (!elements.sublessonContainer) return;
    elements.sublessonContainer.innerHTML = '';
    const lessonSublessons = sublessons.filter(s => s.lessonId === lessonId).sort((a,b) => (a.order||999) - (b.order||999));
    if (lessonSublessons.length === 0) {
        setTimeout(() => {
            elements.lessonSelectionContainer.style.display = 'none';
            elements.quizContainer.style.display = 'block';
            loadQuestions();
        }, 500);
        return;
    }
    lessonSublessons.forEach(sublesson => {
        const card = document.createElement('div');
        card.className = 'sublesson-card';
        card.dataset.sublesson = sublesson.id;
        card.innerHTML = `<i class="fas ${sublesson.icon || 'fa-folder'}"></i><h3>${sublesson.name || ''}</h3><p>${sublesson.description || ''}</p>`;
        card.addEventListener('click', () => {
            selectedSublesson = sublesson.id;
            setTimeout(() => {
                elements.sublessonSelectionContainer.style.display = 'none';
                elements.quizContainer.style.display = 'block';
                loadQuestions();
            }, 500);
        });
        elements.sublessonContainer.appendChild(card);
    });
    elements.lessonSelectionContainer.style.display = 'none';
    elements.sublessonSelectionContainer.style.display = 'block';
    elements.headerBackBtn.style.display = 'flex';
}

function loadQuestions() {
    if (!database) {
        showNoQuestionsMessage();
        return;
    }

    showLoading(true);

    const cachedData = localStorage.getItem(QUESTIONS_CACHE_KEY);
    if (cachedData) {
        try {
            const cachedQuestions = JSON.parse(cachedData);
            if (Array.isArray(cachedQuestions) && cachedQuestions.length > 0) {
                filterQuestions(cachedQuestions);
                return;
            }
        } catch (error) {
            localStorage.removeItem(QUESTIONS_CACHE_KEY);
        }
    }

    // تعيين مهلة للتحميل
    loadingTimer = setTimeout(() => {
        showLoading(false);
        showNoQuestionsMessage();
    }, 15000);

    database.ref('questions').once('value', (snapshot) => {
        clearTimeout(loadingTimer);
        const allQuestions = [];
        snapshot.forEach(child => {
            const q = child.val();
            q.id = child.key;
            allQuestions.push(q);
        });

        try {
            localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(allQuestions));
        } catch (error) {
            console.warn('Failed to cache questions locally:', error);
        }

        filterQuestions(allQuestions);
    }).catch(error => {
        clearTimeout(loadingTimer);
        showLoading(false);
        console.error('Error loading questions:', error);
        showNoQuestionsMessage();
    });
}

function filterQuestions(allQuestions) {
    clearTimeout(loadingTimer);
    questions = allQuestions.filter(q =>
        q.year === selectedYear && q.section === selectedSection &&
        (!selectedSubject || q.subject === selectedSubject) &&
        (!selectedLesson || q.lesson === selectedLesson) &&
        (!selectedSublesson || q.sublesson === selectedSublesson)
    );
    showLoading(false);
    if (questions.length > 0) startQuiz();
    else showNoQuestionsMessage();
}

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = Array(questions.length).fill(null);
    quizStartTime = new Date();
    elements.totalQNum.textContent = questions.length;
    showQuestion();
    elements.quizContainer.style.display = 'block';
    elements.resultsContainer.style.display = 'none';
    elements.headerBackBtn.style.display = 'flex';
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        submitQuiz();
        return;
    }

    elements.currentQNum.textContent = currentQuestionIndex + 1;
    const q = questions[currentQuestionIndex];
    const currentAnswer = userAnswers[currentQuestionIndex];

    let html = `
        <div class="question-card">
            <div class="question-text">${escapeHtml(q.text || '')}</div>
    `;

    if (q.type === 'mcq') {
        html += `<div class="options-list">`;
        const letters = ['أ', 'ب', 'ج', 'د'];
        for (let i = 1; i <= 4; i++) {
            const opt = q[`option${i}`];
            if (opt) {
                const isSelected = currentAnswer === i.toString();
                html += `
                    <div class="option-btn ${isSelected ? 'selected' : ''}" data-answer="${i}">
                        <div class="option-letter">${letters[i-1]}</div>
                        <div class="option-text">${escapeHtml(opt)}</div>
                        <div class="option-check"><i class="fas fa-check"></i></div>
                    </div>
                `;
            }
        }
        html += `</div>`;
    } else if (q.type === 'truefalse') {
        html += `
            <div class="tf-options">
                <div class="tf-btn ${currentAnswer === 'true' ? 'selected' : ''}" data-answer="true">
                    <i class="fas fa-check-circle"></i> صح
                </div>
                <div class="tf-btn ${currentAnswer === 'false' ? 'selected' : ''}" data-answer="false">
                    <i class="fas fa-times-circle"></i> خطأ
                </div>
            </div>
        `;
    }
    html += `</div>`;
    elements.questionContainer.innerHTML = html;

    // إضافة مستمعي الأحداث
    if (q.type === 'mcq') {
        document.querySelectorAll('.option-btn').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.option-btn').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                userAnswers[currentQuestionIndex] = opt.dataset.answer;
            });
        });
    } else if (q.type === 'truefalse') {
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                userAnswers[currentQuestionIndex] = btn.dataset.answer;
            });
        });
    }

    // تحديث الأزرار
    elements.prevBtn.disabled = currentQuestionIndex === 0;
    const isLast = currentQuestionIndex === questions.length - 1;
    elements.nextBtn.style.display = isLast ? 'none' : 'flex';
    elements.submitBtn.style.display = isLast ? 'flex' : 'none';
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

function submitQuiz() {
    score = 0;
    let feedbackHTML = '<h3>التصحيح:</h3><ul>';
    questions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = userAns === q.correctAnswer;
        if (isCorrect) score++;
        feedbackHTML += `<li><strong>السؤال ${idx + 1}:</strong> ${escapeHtml(q.text || '')}<br><span style="color: ${isCorrect ? 'green' : 'red'}">إجابتك: ${formatAnswer(q, userAns)} - ${isCorrect ? '✓ صحيح' : '✗ خطأ (الإجابة: ' + formatAnswer(q, q.correctAnswer) + ')'}</span></li>`;
    });
    feedbackHTML += '</ul>';

    const percentage = Math.round((score / questions.length) * 100);
    const timeTaken = calculateTimeTaken();

    elements.quizContainer.style.display = 'none';
    elements.resultsContainer.style.display = 'block';
    elements.scoreDisplay.textContent = score;
    elements.percentageDisplay.textContent = `${percentage}%`;
    if (percentage >= 90) elements.percentageDisplay.innerHTML += ' <i class="fas fa-medal" style="color:#FFD700"></i>';
    else if (percentage >= 75) elements.percentageDisplay.innerHTML += ' <i class="fas fa-medal" style="color:#C0C0C0"></i>';
    else if (percentage >= 50) elements.percentageDisplay.innerHTML += ' <i class="fas fa-medal" style="color:#CD7F32"></i>';
    elements.timeTakenDisplay.textContent = timeTaken;
    elements.feedbackDisplay.innerHTML = feedbackHTML;

    if (database) {
        database.ref('quizResults').push({
            score, totalQuestions: questions.length, percentage, timeTaken,
            year: selectedYear, section: selectedSection, subject: selectedSubject,
            lesson: selectedLesson, sublesson: selectedSublesson,
            timestamp: new Date().toISOString(), userName: 'زائر'
        }).catch(error => console.error('Error saving results:', error));
    }
}

function formatAnswer(q, ans) {
    if (!ans) return 'لم يتم الإجابة';
    if (q.type === 'mcq') return q[`option${ans}`] || ans;
    return ans === 'true' ? 'صح' : 'خطأ';
}

function calculateTimeTaken() {
    if (!quizStartTime) return '00:00';
    const diff = new Date() - quizStartTime;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function restartQuiz() {
    elements.quizContainer.style.display = 'block';
    elements.resultsContainer.style.display = 'none';
    startQuiz();
}

function showNoQuestionsMessage() {
    if (elements.questionContainer) {
        elements.questionContainer.innerHTML = `<div class="no-questions"><i class="fas fa-info-circle"></i><h3>لا توجد إختبارات متاحة حالياً</h3><p>يرجى المحاولة مرة أخرى لاحقاً</p></div>`;
    }
    elements.quizContainer.style.display = 'block';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function goBack() {
    // إزالة معامل الرابط من URL عند الرجوع
    const url = new URL(window.location.href);
    if (url.searchParams.has('section')) {
        url.searchParams.delete('section');
        window.history.pushState({}, '', url);
    }

    if (elements.quizContainer && elements.quizContainer.style.display === 'block') {
        elements.quizContainer.style.display = 'none';
        if (selectedSublesson && elements.sublessonSelectionContainer) {
            elements.sublessonSelectionContainer.style.display = 'block';
            selectedSublesson = '';
        }
        else if (selectedLesson && elements.lessonSelectionContainer) {
            elements.lessonSelectionContainer.style.display = 'block';
            if (elements.sublessonSelectionContainer) elements.sublessonSelectionContainer.style.display = 'none';
            selectedLesson = '';
        }
        else if (selectedSubject && elements.subjectSelectionContainer) {
            elements.subjectSelectionContainer.style.display = 'block';
            if (elements.lessonSelectionContainer) elements.lessonSelectionContainer.style.display = 'none';
            selectedSubject = '';
        }
        else if (selectedSection && elements.sectionSelectionContainer) {
            elements.sectionSelectionContainer.style.display = 'block';
            if (elements.subjectSelectionContainer) elements.subjectSelectionContainer.style.display = 'none';
            selectedSection = '';
        }
        else if (elements.yearSelectionContainer) {
            elements.yearSelectionContainer.style.display = 'grid';
            if (elements.sectionSelectionContainer) elements.sectionSelectionContainer.style.display = 'none';
            if (elements.headerBackBtn) elements.headerBackBtn.style.display = 'none';
        }
    } else if (elements.sublessonSelectionContainer && elements.sublessonSelectionContainer.style.display === 'block') {
        elements.sublessonSelectionContainer.style.display = 'none';
        if (elements.lessonSelectionContainer) elements.lessonSelectionContainer.style.display = 'block';
        selectedSublesson = '';
    }
    else if (elements.lessonSelectionContainer && elements.lessonSelectionContainer.style.display === 'block') {
        elements.lessonSelectionContainer.style.display = 'none';
        if (elements.subjectSelectionContainer) elements.subjectSelectionContainer.style.display = 'block';
        selectedLesson = '';
    }
    else if (elements.subjectSelectionContainer && elements.subjectSelectionContainer.style.display === 'block') {
        elements.subjectSelectionContainer.style.display = 'none';
        if (elements.sectionSelectionContainer) elements.sectionSelectionContainer.style.display = 'block';
        selectedSubject = '';
    }
    else if (elements.sectionSelectionContainer && elements.sectionSelectionContainer.style.display === 'block') {
        elements.sectionSelectionContainer.style.display = 'none';
        if (elements.yearSelectionContainer) elements.yearSelectionContainer.style.display = 'grid';
        if (elements.headerBackBtn) elements.headerBackBtn.style.display = 'none';
        selectedSection = '';
    }
}

function setupEventListeners() {
    if (elements.yearCards) {
        elements.yearCards.forEach(card => {
            card.addEventListener('click', function() {
                selectedYear = this.dataset.year;
                loadSectionsForYear(selectedYear);
            });
        });
    }

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            if (isDarkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                localStorage.setItem('darkMode', 'true');
            }
            else {
                document.documentElement.removeAttribute('data-theme');
                elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                localStorage.setItem('darkMode', 'false');
            }
        });
    }

    if (elements.headerBackBtn) elements.headerBackBtn.addEventListener('click', goBack);
    if (elements.nextBtn) elements.nextBtn.addEventListener('click', nextQuestion);
    if (elements.prevBtn) elements.prevBtn.addEventListener('click', prevQuestion);
    if (elements.submitBtn) elements.submitBtn.addEventListener('click', submitQuiz);
    if (elements.restartBtn) elements.restartBtn.addEventListener('click', restartQuiz);
    if (elements.adClose) elements.adClose.addEventListener('click', () => { if(elements.adContainer) elements.adContainer.style.display = 'none'; });
    if (elements.adAction) {
        elements.adAction.addEventListener('click', () => {
            if(currentAd && currentAd.url) window.open(currentAd.url, '_blank');
        });
    }
}

function init() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (elements.themeToggle) elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    setupEventListeners();
    loadData();
}

init();

/* ====== تأثير الإمالة ثلاثي الأبعاد التفاعلي ====== */
(function setup3DTilt() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; // تعطيله على اللمس

    const TILT_SELECTOR = '.year-card, .section-card, .subject-card, .sublesson-card';
    const MAX = 9; // أقصى زاوية إمالة بالدرجات

    document.addEventListener('mousemove', (e) => {
        const card = e.target.closest(TILT_SELECTOR);
        if (!card) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const ry = (px - 0.5) * (MAX * 2);
        const rx = (0.5 - py) * (MAX * 2);
        card.style.transform = `translateY(-8px) scale(1.03) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const card = e.target.closest(TILT_SELECTOR);
        if (card) card.style.transform = '';
    }, { passive: true });
})();
