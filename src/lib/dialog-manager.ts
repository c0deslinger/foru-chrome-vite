// src/lib/dialog-manager.ts

/**
 * DialogManager - Utility class for managing popup dialogs
 * Ensures only one dialog is open at a time by closing existing dialogs
 */

export class DialogManager {
  private static instance: DialogManager;
  
  // CSS selectors for different dialog types
  private static readonly DIALOG_SELECTORS = [
    '.foru-tweet-analysis-overlay',
    '.foru-dna-dialog-overlay', 
    '.foru-badge-dialog-overlay'
  ];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }
    return DialogManager.instance;
  }

  /**
   * Close all existing dialogs before opening a new one
   */
  public closeAllDialogs(): void {
    console.log('DialogManager: Closing all existing dialogs...');
    
    DialogManager.DIALOG_SELECTORS.forEach(selector => {
      const existingDialog = document.querySelector(selector);
      if (existingDialog) {
        console.log(`DialogManager: Found and closing dialog with selector: ${selector}`);
        existingDialog.remove();
      }
    });
  }

  /**
   * Check if any dialog is currently open
   */
  public isAnyDialogOpen(): boolean {
    return DialogManager.DIALOG_SELECTORS.some(selector => {
      return document.querySelector(selector) !== null;
    });
  }

  /**
   * Get list of currently open dialog selectors
   */
  public getOpenDialogs(): string[] {
    return DialogManager.DIALOG_SELECTORS.filter(selector => {
      return document.querySelector(selector) !== null;
    });
  }

  /**
   * Close specific dialog by selector
   */
  public closeDialog(selector: string): void {
    const dialog = document.querySelector(selector);
    if (dialog) {
      console.log(`DialogManager: Closing dialog with selector: ${selector}`);
      dialog.remove();
    }
  }

  /**
   * Register a new dialog selector (for future dialog types)
   */
  public registerDialogSelector(selector: string): void {
    if (!DialogManager.DIALOG_SELECTORS.includes(selector)) {
      DialogManager.DIALOG_SELECTORS.push(selector);
      console.log(`DialogManager: Registered new dialog selector: ${selector}`);
    }
  }
}

// Export singleton instance for easy access
export const dialogManager = DialogManager.getInstance();
