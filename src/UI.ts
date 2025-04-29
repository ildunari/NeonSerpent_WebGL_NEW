// Define potential game states or actions triggered by UI
export type UIAction =
    | 'startGame'
    | 'showControls'
    | 'hideControls'
    | 'resumeGame'
    | 'pauseGame' // Although pause might be triggered by key press, menu could confirm
    | 'newGameFromPause'
    | 'newGameFromGameOver'
    // | 'showScoreboard' // Placeholder for original scoreboard button if needed
    | 'toggleDevMode';

// Callback type for UI actions
export type UIActionCallback = (action: UIAction) => void;

export class UIManager {
    // Menu Containers
    private mainMenu: HTMLElement | null = null;
    private controlsMenu: HTMLElement | null = null;
    private pauseMenu: HTMLElement | null = null;
private gameOverMenu: HTMLElement | null = null;
private loadingScreen: HTMLElement | null = null; // Keep track of loading screen
private pauseLeaderboardList: HTMLElement | null = null; // Added for in-game leaderboard
private inGameMiniBoard: HTMLElement | null = null;

    // Score Display
    private finalScoreElement: HTMLElement | null = null;

    // Callback for notifying the game logic
    private actionCallback: UIActionCallback;

    constructor(callback: UIActionCallback) {
        this.actionCallback = callback;
    }

    init(): void {
        // Get menu elements
        this.mainMenu = document.getElementById('mainMenu');
        this.controlsMenu = document.getElementById('controlsMenu');
        this.pauseMenu = document.getElementById('pauseMenu');
        this.gameOverMenu = document.getElementById('gameOverMenu');
        this.loadingScreen = document.getElementById('loadingScreen');
this.finalScoreElement = document.getElementById('finalScore');
this.pauseLeaderboardList = document.getElementById('pauseLeaderboardList'); // Get pause leaderboard list
this.inGameMiniBoard = document.getElementById('inGameLeaderboard');

        // Basic validation
if (!this.mainMenu || !this.controlsMenu || !this.pauseMenu || !this.gameOverMenu || !this.loadingScreen || !this.finalScoreElement || !this.pauseLeaderboardList) {
console.error('UIManager: Failed to find one or more required UI elements!');
// Don't return here, just warn about missing mini-board if applicable
// return;
}
if (!this.inGameMiniBoard) console.warn('#inGameLeaderboard missing');

        // --- Attach Button Listeners ---

        // Main Menu Buttons
        this.attachListener('startGameBtn', () => this.actionCallback('startGame'));
        this.attachListener('controlsBtnMain', () => this.actionCallback('showControls'));
        // Scoreboard button is placeholder for now - Re-add if needed, or use the new ID if keeping the button
        // this.attachListener('showLeaderboardBtn', () => this.actionCallback('showLeaderboard')); // Example if keeping button
        this.attachListener('scoreboardBtn', () => console.log('Scoreboard clicked (placeholder)')); // Original placeholder listener
        // Dev Mode Button
        this.attachListener('toggleDevModeBtn', () => this.actionCallback('toggleDevMode'));

        // Controls Menu Buttons
        this.attachListener('backToMainBtnControls', () => this.actionCallback('hideControls'));

        // Pause Menu Buttons
        this.attachListener('resumeGameBtn', () => this.actionCallback('resumeGame'));
        this.attachListener('newGameBtnPause', () => this.actionCallback('newGameFromPause'));
        this.attachListener('controlsBtnPause', () => this.actionCallback('showControls'));

        // Game Over Menu Buttons
        this.attachListener('mainMenuBtnGameOver', () => this.actionCallback('newGameFromGameOver')); // Or could be 'showMainMenu'

        console.log('UIManager initialized.');
        // Initially, ensure only the main menu might be visible (or none if loading)
        // Actual visibility will be controlled by Game state later
        this.hideAllMenus();
    }

    private attachListener(elementId: string, callback: () => void): void {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', callback);
        } else {
            console.warn(`UIManager: Element with ID "${elementId}" not found.`);
        }
    }

    hideAllMenus(): void {
        this.mainMenu?.classList.add('hidden');
        this.controlsMenu?.classList.add('hidden');
        this.pauseMenu?.classList.add('hidden');
        this.gameOverMenu?.classList.add('hidden');
    }

    showMainMenu(): void {
        this.hideAllMenus();
        this.mainMenu?.classList.remove('hidden');
    }

    showControlsMenu(): void {
        // Show the controls menu and apply blur
        this.controlsMenu?.classList.remove('hidden');
        this.controlsMenu?.classList.add('backdrop-blur'); // Add blur class
    }

    hideControlsMenu(): void {
         // Hide the controls menu and remove blur
         this.controlsMenu?.classList.add('hidden');
         this.controlsMenu?.classList.remove('backdrop-blur'); // Remove blur class
    }

    showPauseMenu(): void { // Will be updated later to accept scores
        this.hideAllMenus(); // Usually pause takes over the screen
        this.pauseMenu?.classList.remove('hidden');
    }

    showGameOverMenu(score: number): void {
        this.hideAllMenus();
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = `Score: ${score}`;
        }
        this.gameOverMenu?.classList.remove('hidden');
    }

    // --- Loading Screen ---
    hideLoadingScreen(): void {
        this.loadingScreen?.style.setProperty('display', 'none'); // Use setProperty for style changes
    }

    showLoadingScreen(message: string = 'Loading...'): void {
         if (this.loadingScreen) {
            this.loadingScreen.textContent = message;
            this.loadingScreen.style.setProperty('display', 'flex');
         }
    }

    // --- In-Game Leaderboard Update ---
    updatePauseLeaderboard(scores: { name: string, score: number, isPlayer: boolean }[]): void {
        if (!this.pauseLeaderboardList) return;

        // Clear previous entries
        this.pauseLeaderboardList.innerHTML = '';

        // Sort scores descending
        scores.sort((a, b) => b.score - a.score);

        // Populate with new scores (limit to top 10 or less)
        const topScores = scores.slice(0, 10);
        topScores.forEach(entry => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('leaderboard-name');
            if (entry.isPlayer) {
                nameSpan.classList.add('player-score'); // Highlight player name
            }
            nameSpan.textContent = entry.name;

            const scoreSpan = document.createElement('span');
            scoreSpan.classList.add('leaderboard-score');
             if (entry.isPlayer) {
                scoreSpan.classList.add('player-score'); // Highlight player score
            }
            scoreSpan.textContent = entry.score.toString();

            li.appendChild(nameSpan);
            li.appendChild(scoreSpan);
this.pauseLeaderboardList?.appendChild(li);
});
}

// 🆕 live HUD (top 5)
updateMiniLeaderboard(scores:{name:string,score:number,isPlayer:boolean}[]) {
if(!this.inGameMiniBoard) return;
// hide on small screens (CSS already does `display:none`)
this.inGameMiniBoard.innerHTML = '';
scores.sort((a,b)=>b.score-a.score);
scores.slice(0,5).forEach(e=>{
const div=document.createElement('div');
div.className='mini-row'+(e.isPlayer?' player':'');
div.textContent=`${e.name}  ${e.score}`;
this.inGameMiniBoard!.appendChild(div);
});
}

}

// Export the class and types
// export {}; // No longer needed as class is exported
