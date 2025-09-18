// // src/profile/quests.js

// /**
//  * Render isi Active Quests Section ke dalam <div id="quests-in-profile">.
//  */
// function renderQuestsSection() {
//   const container = document.getElementById("quests-in-profile");
//   if (!container) return;

//   container.innerHTML = ""; // kosongkan dulu

//   const quests = [
//     { id: 1, title: "Share 5 posts in a week", progress: "2/5", xp: 100 },
//     { id: 2, title: "Connect 3 social accounts", progress: "2/3", xp: 150 },
//     { id: 3, title: "Receive 10 comments", progress: "4/10", xp: 200 },
//   ];

//   // Judul
//   const titleEl = document.createElement("h3");
//   titleEl.className = "text-xs text-gray-400";
//   titleEl.innerText = "Active Quests";
//   container.appendChild(titleEl);

//   quests.forEach((q) => {
//     const item = document.createElement("div");
//     item.className = "quest-item";

//     const infoDiv = document.createElement("div");
//     infoDiv.className = "quest-info";
//     const ratio =
//       (parseInt(q.progress.split("/")[0], 10) /
//         parseInt(q.progress.split("/")[1], 10)) *
//       100;
//     infoDiv.innerHTML = `
//         <div class="quest-title">${q.title}</div>
//         <div class="quest-progress-bar">
//           <div class="quest-progress-fill" style="width: ${ratio}%;"></div>
//         </div>
//         <div class="text-xs text-gray-500">${q.progress} completed</div>
//       `;

//     const xpDiv = document.createElement("div");
//     xpDiv.className = "quest-xp";
//     xpDiv.innerText = `+${q.xp} XP`;

//     item.appendChild(infoDiv);
//     item.appendChild(xpDiv);
//     container.appendChild(item);
//   });
// }

// window.renderQuestsSection = renderQuestsSection;
