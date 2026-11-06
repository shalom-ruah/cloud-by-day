const BANK_URL = 'question-bank.json';
const STORAGE_KEY = 'cloudByDayProgressV1';
const letters = ['A','B','C','D'];
let bank = null;
let selectedSections = new Set();
let quiz = null;
let toastTimer;

const $ = (id) => document.getElementById(id);
const sectionList = $('section-list');
const countInput = $('question-count');
const startButton = $('start-quiz');

function readProgress(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {answered:{},correct:{},sessions:0};}
  catch{return {answered:{},correct:{},sessions:0};}
}
function saveProgress(data){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function shuffle(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function getSectionQuestions(id){return bank.questions.filter(q=>q.section_id===id);}
function getSelectedQuestions(){return bank.questions.filter(q=>selectedSections.has(q.section_id));}
function updateSelectionUI(){
  const selected=bank.sections.filter(section=>selectedSections.has(section.id));
  const available=getSelectedQuestions().length;
  $('selection-summary').textContent=`${selected.length} of ${bank.sections.length} sections selected · ${available} questions available`;
  countInput.max=Math.max(1,available);
  countInput.value=Math.min(Math.max(1,Number(countInput.value)||10),Math.max(1,available));
  $('count-help').textContent=selected.length?`${available} questions available across your selected sections.`:'Select at least one section to start.';
  startButton.disabled=available===0;
  renderSections();
}
function renderSections(){
  sectionList.innerHTML='';
  bank.sections.forEach(section=>{
    const questions=getSectionQuestions(section.id);
    const progress=readProgress();
    const done=questions.filter(q=>progress.answered[q.id]).length;
    const selected=selectedSections.has(section.id);
    const card=document.createElement('button');
    card.type='button';card.className='section-card'+(selected?' selected':'');
    card.setAttribute('aria-pressed',selected?'true':'false');
    card.innerHTML=`<div class="section-card-top"><span class="section-code">${escapeHTML(section.id.replace('-',' · '))}</span><span class="section-questions">${questions.length} QUESTIONS</span></div><h3>${escapeHTML(section.title.replace(/^M\d Week \d — /,''))}</h3><div class="section-progress"><span style="width:${questions.length?done/questions.length*100:0}%"></span></div><span class="section-check" aria-hidden="true">${selected?'✓':'+'}</span>`;
    card.addEventListener('click',()=>toggleSection(section.id));sectionList.appendChild(card);
  });
}
function toggleSection(id){
  if(selectedSections.has(id))selectedSections.delete(id);else selectedSections.add(id);
  updateSelectionUI();
}
function updateCount(value){const max=getSelectedQuestions().length;if(!max)return;const n=Math.max(1,Math.min(max,Math.floor(Number(value)||1)));countInput.value=n;countInput.max=max;}
function renderProgress(){
  const p=readProgress();const answered=Object.keys(p.answered).length;const correct=Object.values(p.correct).filter(Boolean).length;const accuracy=answered?Math.round(correct/answered*100):null;
  $('completed-stat').textContent=answered;$('progress-answered').textContent=answered;$('progress-accuracy').textContent=accuracy===null?'—':`${accuracy}%`;$('progress-sessions').textContent=p.sessions||0;
  const holder=$('topic-progress');holder.innerHTML='';
  bank.sections.forEach(section=>{const qs=getSectionQuestions(section.id);const done=qs.filter(q=>p.answered[q.id]).length;const row=document.createElement('div');row.className='topic-row';row.innerHTML=`<div class="topic-row-head"><span>${escapeHTML(section.title.replace(/^M\d Week \d — /,''))}</span><span>${done}/${qs.length} answered</span></div><div class="topic-bar"><span style="width:${done/qs.length*100}%"></span></div>`;holder.appendChild(row);});
}
function startQuiz(){
  const pool=getSelectedQuestions();if(!pool.length)return;
  const amount=Math.max(1,Math.min(pool.length,Number(countInput.value)||1));
  const mode=$('quiz-mode').value;
  const chosenSections=bank.sections.filter(section=>selectedSections.has(section.id));
  quiz={mode,sections:chosenSections,questions:shuffle(pool).slice(0,amount).map(q=>({...q,displayOptions:shuffle(q.options)})),index:0,answers:[],locked:false};
  $('quiz-overlay').hidden=false;document.body.style.overflow='hidden';renderQuestion();
}
function renderQuestion(){
  const q=quiz.questions[quiz.index];quiz.locked=false;
  const progress=(quiz.index/quiz.questions.length)*100;
  $('quiz-stage').innerHTML=`<div class="quiz-meta"><span>${escapeHTML(bank.sections.find(section=>section.id===q.section_id)?.title||'Course question')}</span><span>QUESTION ${quiz.index+1} OF ${quiz.questions.length}</span></div><div class="quiz-progress"><span style="width:${progress}%"></span></div><div class="quiz-kicker">${escapeHTML(String(q.type||'QUESTION').replaceAll('_',' ').toUpperCase())} · ${escapeHTML(q.topic||'REVISION')}</div><h1 class="quiz-question" id="quiz-title">${escapeHTML(q.question)}</h1><div class="answer-list" id="answer-list">${q.displayOptions.map((option,i)=>`<button type="button" class="answer-option" data-option="${i}"><span class="answer-letter">${letters[i]}</span><span>${escapeHTML(option)}</span></button>`).join('')}</div><div id="feedback-slot"></div><div class="quiz-actions"><button type="button" class="subtle-button" id="quit-session">Exit session</button><button type="button" class="button button-primary" id="quiz-next" disabled>${quiz.index===quiz.questions.length-1?'Finish session':'Next question'} <span>→</span></button></div>`;
  document.querySelectorAll('.answer-option').forEach(btn=>btn.addEventListener('click',()=>chooseAnswer(Number(btn.dataset.option))));
  $('quiz-next').addEventListener('click',nextQuestion);$('quit-session').addEventListener('click',closeQuiz);
}
function chooseAnswer(optionIndex){
  if(quiz.locked)return;quiz.locked=true;
  const q=quiz.questions[quiz.index];const chosen=q.displayOptions[optionIndex];const isCorrect=chosen===q.correct_answer;
  quiz.answers.push({question:q,chosen,isCorrect});
  document.querySelectorAll('.answer-option').forEach((btn,i)=>{const text=q.displayOptions[i];if(quiz.mode==='practice'){if(text===q.correct_answer)btn.classList.add('correct');else if(i===optionIndex)btn.classList.add('incorrect');}else if(i===optionIndex){btn.classList.add(isCorrect?'correct':'incorrect');}btn.disabled=true;});
  const p=readProgress();p.answered[q.id]=true;p.correct[q.id]=isCorrect;saveProgress(p);renderProgress();
  if(quiz.mode==='practice'){
    const wrong=q.distractor_feedback||{};const wrongNotes=Object.entries(wrong).map(([answer,reason])=>`<p><b>${escapeHTML(answer)}</b> — ${escapeHTML(reason)}</p>`).join('');
    $('feedback-slot').innerHTML=`<div class="feedback-panel"><div class="feedback-status ${isCorrect?'good':'bad'}">${isCorrect?'Correct. Nice work.':'Not quite. Review the reasoning.'}</div><p>${escapeHTML(q.explanation)}</p>${wrongNotes?`<div class="why-wrong">${wrongNotes}</div>`:''}</div>`;
  }
  $('quiz-next').disabled=false;
}
function nextQuestion(){if(!quiz.locked)return;if(quiz.index<quiz.questions.length-1){quiz.index++;renderQuestion();}else showResults();}
function showResults(){
  const total=quiz.questions.length;const correct=quiz.answers.filter(a=>a.isCorrect).length;const pct=Math.round(correct/total*100);const wrong=quiz.answers.filter(a=>!a.isCorrect);
  const p=readProgress();p.sessions=(p.sessions||0)+1;saveProgress(p);renderProgress();
  const review=quiz.answers.map((a,i)=>`<article class="review-item"><strong>${i+1}. ${escapeHTML(a.question.question)}</strong><p class="${a.isCorrect?'review-answer':''}">${a.isCorrect?'Correct':'Your answer: '+escapeHTML(a.chosen)}${a.isCorrect?'':' · Correct answer: '+escapeHTML(a.question.correct_answer)}</p><p>${escapeHTML(a.question.explanation)}</p></article>`).join('');
  $('quiz-stage').innerHTML=`<div class="results-top"><div class="result-icon">${pct>=70?'✓':'↗'}</div><div class="quiz-kicker">SESSION COMPLETE</div><h2>Good work. Keep going.</h2><p>${escapeHTML(quiz.sections.map(section=>section.title.replace(/^M\d Week \d — /,'')).join(' + '))} · ${quiz.mode==='practice'?'Practice mode':'Test mode'}</p><div class="result-score">${pct}<span>%</span></div></div><div class="result-cards"><div class="result-card"><strong>${correct}/${total}</strong><span>Correct answers</span></div><div class="result-card"><strong>${wrong.length}</strong><span>To review</span></div><div class="result-card"><strong>${total}</strong><span>Questions attempted</span></div></div><h3 class="review-title">Answer review</h3>${review}<div class="results-actions"><button type="button" class="button button-primary" id="try-again">Try another session <span>→</span></button><button type="button" class="button" style="background:#eef2f8;color:#40516a" id="back-home">Back to question bank</button></div>`;
  $('try-again').addEventListener('click',()=>{closeQuiz();startQuiz();});$('back-home').addEventListener('click',closeQuiz);
}
function closeQuiz(){$('quiz-overlay').hidden=true;document.body.style.overflow='';quiz=null;renderProgress();}
const THEME_KEY='cloudByDayThemeV1';
function applyTheme(theme){
  const chosen=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=chosen;
  const dark=chosen==='dark';
  $('theme-label').textContent=dark?'Light mode':'Dark mode';
  $('theme-toggle').setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
  $('theme-toggle').title=dark?'Switch to light mode':'Switch to dark mode';
  $('theme-toggle').querySelector('.theme-icon').textContent=dark?'☀':'☾';
}
function toggleTheme(){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem(THEME_KEY,next);applyTheme(next);}
function initTheme(){let saved='light';try{saved=localStorage.getItem(THEME_KEY)||'light';}catch{}applyTheme(saved);}

async function init(){
  initTheme();
  $('current-year').textContent=new Date().getFullYear();
  try{
    const response=await fetch(BANK_URL);if(!response.ok)throw new Error('Could not load question-bank.json');bank=await response.json();
    if(!Array.isArray(bank.questions)||!Array.isArray(bank.sections))throw new Error('Question bank format is not valid');
    $('total-questions').textContent=bank.questions.length;$('bank-status').textContent=`${bank.questions.length} questions ready`;
    selectedSections=new Set([bank.sections[0].id]);updateSelectionUI();renderProgress();
  }catch(error){sectionList.innerHTML='<div class="loading-card">The question bank could not be loaded. Check that <b>question-bank.json</b> is in the same folder as index.html, style.css and app.js. If you opened the page directly as a file, run it through your local web server.</div>';$('bank-status').textContent='Question bank unavailable';console.error(error);}
  startButton.addEventListener('click',startQuiz);
  $('select-all-sections').addEventListener('click',()=>{selectedSections=new Set(bank.sections.map(section=>section.id));updateSelectionUI();});
  $('clear-sections').addEventListener('click',()=>{selectedSections.clear();updateSelectionUI();});
  countInput.addEventListener('change',()=>updateCount(countInput.value));
  $('count-minus').addEventListener('click',()=>updateCount(Number(countInput.value)-1));$('count-plus').addEventListener('click',()=>updateCount(Number(countInput.value)+1));
  $('quiz-mode').addEventListener('change',()=>{$('mode-help').textContent=$('quiz-mode').value==='practice'?'Get instant feedback and explanations after each answer.':'Answer all questions first, then see your score and answer review.';});
  $('close-quiz').addEventListener('click',closeQuiz);
  $('theme-toggle').addEventListener('click',toggleTheme);
  $('reset-progress').addEventListener('click',()=>{if(confirm('Reset all Cloud by Day progress saved in this browser?')){localStorage.removeItem(STORAGE_KEY);renderSections();renderProgress();showToast('Your local progress has been reset.');}});
  document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));link.classList.add('active');}));
}
init();
