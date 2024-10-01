// ==UserScript==
// @name         pre-fill for forms.yandex.ru
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  try to take over the world!
// @author       You
// @match        https://forms.yandex.ru/surveys/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

// TODO: если какой-то селектор не сработал говорить об этом
// TODO: добавить typescript

(async function() {
  'use strict';
  console.log('fosemberg');

  // constants {

  const checkIsMobile = () => true;

  const findElementByText = (text, parent = document) => {
    const nodes = Array.from(parent?.querySelectorAll?.('*') || []);
    for (const node of nodes) {
      if (node.innerText === text) {
        return node;
      }
    }
  }

  const findElementIncludesText = (text, parent = document) => {
    const nodes = Array.from(parent?.querySelectorAll?.('*') || []);
    for (const node of nodes) {
      if (node.innerText?.includes(text)) {
        return node;
      }
    }
  }

  const getDesktopWelcomeTitle = () => document.querySelector("body > div.b-page__content > div > div.survey-header > div > h1");
  const getMobileWelcomeTitle = () => document.querySelector("body > div.b-page__content > div > div.survey-header > div > h3");
  const getWelcomeTitle = checkIsMobile() ? getMobileWelcomeTitle : getDesktopWelcomeTitle;
  const getWelcomeTitleText = () => getWelcomeTitle()?.innerText;

  const welcomeUltimaTitleRegExp = /^Ultima/;
  const welcomeComfortPlusTitleRegExp = /^Тариф «Комфорт\+»/;

  const TaxiType = {
    Ultima: 'ultima',
    ComfortPlus: 'comfort_plus',
    empty: '',
  }

  const getTaxiType = () => {
    return findElementIncludesText('Ultima') || findElementIncludesText('Тариф поездки: Business') ? TaxiType.Ultima : TaxiType.ComfortPlus;
  }
  const taxiType = getTaxiType();
  const LOCAL_STORAGE_KEY_QAS = `last_qas_${taxiType}`;
  const localStorageQas = localStorage.getItem(LOCAL_STORAGE_KEY_QAS);
  const qas = localStorageQas ? JSON.parse(localStorageQas) : [];

  const getDesktopWelcomeContent = () => document.querySelector("body > div.b-page__content > div > div.survey-wrap > form > div.survey__section > div.survey__page.survey__page_page_1.survey__page_visible_yes > fieldset > div.survey__question.survey-question.survey-question_name_answer_statement_10283530.survey-question_widget_statement.i-bem.survey-question_js_inited > div > table > tbody > tr:nth-child(1) > td.survey__label > label > div");
  const getMobileWelcomeContent = () => document.querySelector(".SurveyPage-Content strong")
  const getWelcomeContent = checkIsMobile() ? getMobileWelcomeContent : getDesktopWelcomeContent;
  const welcomeContentText = 'Соблюдай важные правила:'

  const getIsTripOkButton = () => {
    const radioQuestion = document.querySelector(".RadioQuestion");
    const isTripOk = findElementByText('Поездка состоялась?', radioQuestion);
    if (isTripOk) {
      console.log(findElementByText('Да', radioQuestion));
      return findElementByText('Да', radioQuestion);
    }
    return null;
  }

  const getWelcomeButton = () => document.querySelector('.SurveyPage-Button');
  const welcomeButtonText = 'Вперёд';

  const getDesktopTitle = () => document.querySelector("body > div.b-page__content > div > div.survey-header > div > h1");
  const getMobileTitle = () => document.querySelector("#root > div > main > form > h1 > p");
  const getTitle = checkIsMobile() ? getMobileTitle : getDesktopTitle;
  const titleTextRegExp = /^(Проверка премиальных тарифов|Тариф «Комфорт\+»)/;

  const getDesktopReminder = () => document.querySelector("body > div.b-page__content > div > div.survey-wrap > form > div.survey__section > div.survey__page.survey__page_page_2.survey__page_visible_yes > fieldset > div.survey__question.survey-question.survey-question_name_answer_statement_10477747.survey-question_widget_statement.i-bem.survey-question_js_inited > div > table > tbody > tr:nth-child(1) > td.survey__label > label > div");
  const getMobileReminder = () => document.querySelector(".SurveyPage-Content").firstChild;
  const reminderTextRegExp = /.*Текст стандартов и правил*/;
  const getReminder = checkIsMobile() ? getMobileReminder : getDesktopReminder;

  // constants }

  // utils {

  const log = alert;

  class Logger {
    output =  '';

    append = (string) => {
      this.output += string + '\n';
    }

    show = () => {
      log(this.output);
      this.output = '';
    }

    showIfNeed = () => {
      if (this.output) {
        this.show();
      }
    }
  }

  const logger = new Logger();

  const checkFabric = (getChecks) => () => {
    for (const [check, value] of Object.entries(getChecks())) {
      if (!value) {
        logger.append(`!${check}`)
        return false;
      }
    }
    return true;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForCondition(
    condition,
    timeout,
    throwError = false,
) {
  let stopChecking = false;

  return Promise.race([
    new Promise(async (resolve) => {
      while (!condition() && !stopChecking) {
        await wait(100);
      }

      resolve();
    }),
    new Promise((resolve, reject) => {
      window.setTimeout(() => {
        stopChecking = true;
        if (throwError) {
          reject(new Error(`Wait for condition reached timeout of ${timeout}`));
        } else {
          resolve();
        }
      }, timeout);
    }),
  ]);
};

  function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  const getQuestionNode = (child) => {
    const finishElement = document.body;
    let currentElement = child;
    while (currentElement && currentElement !== finishElement){
      if (currentElement.classList.contains('Question')) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    return false;
  }

  const answerQuestion = (question, answer) => {
    const questionNode = getQuestionNode(
      findElementByText(question)
    );

    console.log('questionNode', questionNode);

    if (!questionNode) {
      return;
    }

    let clickableNode;
    if (questionNode.classList.contains('RadioQuestion')) {
      const radiobox = questionNode.querySelector('.g-radio-group');
      if ([...radiobox.childNodes].find(label => label.classList.contains('g-radio_checked'))) {
        return;
      }
      clickableNode = findElementByText(
        answer,
        radiobox
      );
    } else if (questionNode.classList.contains('survey-question_widget_checkbox')) {
      const checkbox = questionNode.querySelector('.checkbox');
      if (checkbox.classList.contains('checkbox_checked_yes')) {
        return;
      }
      clickableNode = checkbox.querySelector('.checkbox__control');
    }

    if (clickableNode) {
      console.log('clickableNode', clickableNode);
      clickableNode.click();
    } else {
      logger.append(`${question}, ${answer}`);
    }
  }

  const getLabelTextFromRadioboxQuestionNode = (questionNode) =>
    questionNode
      .querySelector('.QuestionLabel-Text')
      .innerText;

  const getRadioboxesCheckedYes = () => document.querySelectorAll('.g-radio_checked')
  const getRadioboxQas = () => [...getRadioboxesCheckedYes()].map(radiobox => ({
    question: getLabelTextFromRadioboxQuestionNode(getQuestionNode(radiobox)),
    answer: radiobox.innerText,
  }));

  const getCheckboxesCheckedYes = () => document.querySelectorAll('.checkbox_checked_yes');
  const getCheckboxQas = () => [...getCheckboxesCheckedYes()].map(checkbox => ({
    question: checkbox.innerText,
    answer: checkbox.innerText,
  }));

  const saveQasToLocalStorage = () => {
    console.log('saveQasToLocalStorage');
    localStorage.setItem(
      LOCAL_STORAGE_KEY_QAS,
      JSON.stringify(
        [
          ...getCheckboxQas(),
          ...getRadioboxQas(),
        ]
      )
    );
  }


  // utils }

  // globals {

  window.saveQasToLocalStorage = saveQasToLocalStorage;

  // globals }

  // business logic {

  const checkIsWelcomePage = checkFabric(() =>({
    isWelcomeTitle: getTaxiType() !== TaxiType.empty,
    isWelcomeContent: getWelcomeContent()?.innerText.includes(welcomeContentText),
    isTripOkButton: Boolean(getIsTripOkButton()),
  }))

  const checkIsMainPage = checkFabric(() => ({
    isTitle: titleTextRegExp.test(getTitle()?.innerText),
    isReminder: reminderTextRegExp.test(getReminder()?.innerText),
  }));

  const answerQuestions = async () => {
    console.log('answerQuestions');
    for (const {question, answer} of qas) {
      await wait(randomIntFromInterval(10, 100));
      answerQuestion(question, answer);
    }
  }

  await waitForCondition(checkIsWelcomePage, 5_000);
  if (checkIsWelcomePage()) {
    getIsTripOkButton()?.click();
    await waitForCondition(getWelcomeButton, 2_000);
    getWelcomeButton()?.click();
  }

  await wait(500);
  await answerQuestions();

  // business logic }

  // ui {

  const createSaveButton = () => {
    const button = document.createElement('button');
    button.innerHTML = 's';
    button.style.position = 'fixed';
    button.style.zIndex = '99999';
    button.style.width = '30px';
    button.style.height = '30px';
    button.style.bottom = '0';
    button.style.left = '0';
    button.onclick = saveQasToLocalStorage;
    document.body.appendChild(button);
  }

  createSaveButton();

  // ui }

  // css styles {

  function addCss(cssCode) {
    const styleElement = document.createElement("style");
    styleElement.appendChild(document.createTextNode(cssCode));
    document.getElementsByTagName("head")[0].appendChild(styleElement);
  }
  const css = `
.survey__group {
  display: flex;
  flex-direction: column;
}
`
  addCss(css);

  const nodeTextsOrder = [
    'По окончании поездки водитель предложил открыть или открыл дверь?',
    'Водитель встретил вас у двери перед поездкой и открыл дверь или предложил открыть её?',
    'Водитель помог с багажом?',
    'Спрашивал ли водитель что-то кроме пожеланий по поездке?',
    'Водитель одет по дресс-коду?',
    'Подлокотник на заднем сиденье был',
    'В салоне есть посторонние предметы?',
    'В салоне есть зарядка для телефона на видном месте?',
    'В автомобиле есть бутылка воды для пассажира на видном месте?',
    'Слышали ли вы голосовые подсказки навигации и прочие звуки мобильных устройств?',
    'Водитель вежлив и приветлив?',
    'Водитель был отзывчив?',
    'Водитель отвлекался на телефон?',
    'Оцените манеру вождения',
    'Приложите фото или видео из салона, на котором виден дресс-код водителя. Идеально, если будет видно, пристегнулся ли водитель',
  ]

  for (const [i, nodeText] of nodeTextsOrder.entries()) {
    const attachPhotoNode = getQuestionNode(findElementByText(nodeText));
    if (!attachPhotoNode) {
      continue;
    }
    attachPhotoNode.style.order = String(i + 1);
  }

  // css styles }
})();
