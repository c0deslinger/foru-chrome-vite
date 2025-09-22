// src/pages/panel/user/authenticated/current_level/index.ts

/**
 * Current Level Module - Placeholder for future level functionality
 * This module will handle user level display and progression
 */

interface UserLevelData {
  level?: number;
  experience?: number;
  nextLevelExp?: number;
  levelName?: string;
}

/**
 * Renders the user's current level information
 * @param {HTMLElement} targetContainer - Element where the level info will be rendered
 * @param {UserLevelData} levelData - User level data
 */
async function renderCurrentLevel(
  targetContainer: HTMLElement,
  levelData: UserLevelData | null = null
): Promise<void> {
  
  if (!targetContainer) {
    console.error("Target container for current level is not provided.");
    return;
  }

  // Default level data
  const defaultLevelData: UserLevelData = {
    level: 1,
    experience: 0,
    nextLevelExp: 100,
    levelName: "Newcomer"
  };

  const currentLevelData = levelData || defaultLevelData;

  // Calculate progress percentage
  const progressPercentage = Math.round((currentLevelData.experience || 0) / (currentLevelData.nextLevelExp || 100) * 100);

  // Render level information
  const levelHtml = `
    <div class="current-level-container">
      <h3>Current Level</h3>
      <div class="level-card">
        <div class="level-info">
          <div class="level-number">Level ${currentLevelData.level}</div>
          <div class="level-name">${currentLevelData.levelName}</div>
        </div>
        <div class="level-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
          </div>
          <div class="progress-text">${currentLevelData.experience}/${currentLevelData.nextLevelExp} XP</div>
        </div>
      </div>
      <div class="level-description">
        <p>Complete quests and engage with the community to level up!</p>
      </div>
    </div>
  `;

  targetContainer.innerHTML = levelHtml;
  console.log("[CurrentLevel] Level information rendered");
}

export { renderCurrentLevel };
