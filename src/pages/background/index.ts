import {
  getStorage,
  setStorage,
  updateStorage,
} from "@src/shared/utils/storage";
import reloadOnUpdate from "virtual:reload-on-update-in-background-script";
import { produce } from "immer";

reloadOnUpdate("pages/background");

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate("pages/content/style.css");

chrome.runtime.onInstalled.addListener(() => {
  setStorage({
    applications: [],
    viewingApplicationId: null,
    urls: [],
    applicationInProgress: null,
    currentTabs: [],
  });

  chrome.tabs.query({ currentWindow: true }).then((tabs) => {
    setStorage({
      currentTabs: tabs.map((tab) => ({
        id: tab.id,
        toggleIsEnabled: false,
        toggleIsOn: false,
      })),
    });
  });

  chrome.contextMenus.create({
    id: "start-application",
    title: "Start Application",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  updateStorage("currentTabs", (currentTabs) =>
    currentTabs.map((currentTab) => {
      if (currentTab.id === tab.id) {
        return { ...currentTab, toggleIsOn: true };
      }
      return currentTab;
    })
  );
  if (info.menuItemId === "start-application") {
    chrome.tabs.sendMessage(tab.id, {
      event: "startApplication",
      data: {
        url: tab.url,
        title: info.selectionText,
      },
    });
    chrome.tabs.sendMessage(tab.id, {
      event: "openWindow",
      data: {
        page: 0,
      },
    });
    return;
  }
  if (info.menuItemId === "add-question") {
    chrome.tabs.sendMessage(tab.id, {
      event: "addQuestion",
      data: info.selectionText,
    });
    chrome.tabs.sendMessage(tab.id, {
      event: "openWindow",
      data: {
        page: 1,
      },
    });
    return;
  }
  if (info.menuItemId === "add-answer") {
    chrome.tabs.sendMessage(tab.id, {
      event: "addAnswer",
      data: info.selectionText,
    });
    chrome.tabs.sendMessage(tab.id, {
      event: "openWindow",
      data: {
        page: 1,
      },
    });
  }
});

// Keep track of tabs and their toggle status
chrome.tabs.onCreated.addListener((tab) => {
  updateStorage("currentTabs", (currentTabs) => [
    ...currentTabs,
    { id: tab.id, toggleIsEnabled: false, toggleIsOn: false },
  ]);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  updateStorage("currentTabs", (currentTabs) =>
    currentTabs.filter((tab) => tab.id !== tabId)
  );
});

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message: Message, port: chrome.runtime.Port) => {
    const { event } = message;
    const tabId = port.sender?.tab?.id;
    if (event === "getTabId") {
      port.postMessage({ event: "getTabId", data: tabId });
      return;
    }
  });
});

// Update context menu based on applicationInProgress
chrome.runtime.onMessage.addListener(async (message: Message) => {
  const { event, data } = message;
  if (event === "setApplicationInProgress") {
    const applicationInProgress = data;
    chrome.contextMenus.removeAll();
    if (
      !applicationInProgress ||
      (!applicationInProgress.company && !applicationInProgress.link)
    ) {
      chrome.contextMenus.create({
        id: "start-application",
        title: "Start Application",
        contexts: ["selection"],
      });
    } else {
      chrome.contextMenus.create({
        id: "add-question",
        title: "Add Question",
        contexts: ["selection"],
      });
      const incompleteQuestion =
        applicationInProgress.application.questions.find(
          (question) => !question.question || !question.answer
        );
      if (incompleteQuestion?.question) {
        chrome.contextMenus.create({
          id: "add-answer",
          title: "Add Answer",
          contexts: ["selection"],
        });
      }
    }
    return;
  }
  if (event === "completeApplication") {
    const { newApplication, tabId } = data;
    getStorage(["applications", "currentTabs"]).then(
      ({ applications, currentTabs }) => {
        const filteredQuestions = newApplication.application.questions.filter(
          (question) => question.question
        );
        const newApplicationWithFilteredQuestions = produce(
          newApplication,
          (draft) => {
            draft.application.questions = filteredQuestions;
          }
        );
        setStorage({
          applications: [...applications, newApplicationWithFilteredQuestions],
          currentTabs: currentTabs.map((currentTab) => {
            if (currentTab.id === tabId) {
              return { ...currentTab, toggleIsOn: false };
            }
            return currentTab;
          }),
        }).then(() => {
          chrome.tabs.sendMessage(tabId, {
            event: "resetWindow",
            data: null,
          });
        });
      }
    );
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: "start-application",
      title: "Start Application",
      contexts: ["selection"],
    });
  }
});
