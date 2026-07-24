import setupShellStyles from "./spotifySetupShell.module.css";
import setupImportStyles from "./spotifySetupImport.module.css";
import discoveryStyles from "./spotifyDiscovery.module.css";
import panelsStyles from "./spotifyPanels.module.css";
import sharedStyles from "./spotifyShared.module.css";

const styles = {
  ...setupShellStyles,
  ...setupImportStyles,
  ...discoveryStyles,
  ...panelsStyles,
  ...sharedStyles,
};

export default styles;
