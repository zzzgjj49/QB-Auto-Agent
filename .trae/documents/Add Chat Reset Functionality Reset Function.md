# Add Reset/Refresh Feature to AI Chat

It seems you want to clear or reset the AI chat history without refreshing the entire page (which reloads the 3D model). I will add a "Reset" button to the chat interface.

## UI Changes

1. **Add Refresh Button**: Insert a new button `<div class="btn-refresh-chat">` with a refresh icon (`fa-rotate-right`) in the chat header, next to the close button.

## Logic Implementation (`js/ui.js`)

1. **Event Listener**: Bind a click event to the new refresh button.
2. **`resetChat()`** **Method**:

   * Clear all messages from the `#chat-history` container.

   * Re-add the initial greeting message: "System initialized. Waiting for input..." (or Japanese equivalent).

   * Reset any internal AI context if necessary.

## Styling (`css/style.css`)

1. **Style**: Apply the same hover effects and positioning as the existing close button to ensure consistency.

