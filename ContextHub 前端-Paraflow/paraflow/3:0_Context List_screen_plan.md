## Context List
Display and manage all local .ct context files, providing sorting, searching, and file operations.
The page's Layout Hierarchy:
- Header (Full-width):
  - Top Navigation Bar
- Content Container (Positioned below the header):
  - Left Sidebar
  - Main Content Area

### Top Navigation Bar
Provides global application navigation, brand logo, a global search bar for files, "Upload" button (to trigger the Upload Modal), "New Context" button (to navigate to Context Editor), and user settings/profile icon.

### Left Sidebar
Offers filtering and navigation options, including categories like "All Contexts" and "My Contexts," and sort-by options (Name, Updated At, Size).

### Main Content Area
Displays the list of .ct files.
- Toolbar: Includes a search input specific to the list, filter/sort activators (if not handled by the sidebar), and a toggle to switch between card and table view.
- Contexts Display Area: Shows context files either as cards or in a table format. Each entry includes file name, description, updated_at timestamp, and file size. Each item provides action buttons for "Open" (navigates to Context Viewer), "Download," "Delete," and "Share."