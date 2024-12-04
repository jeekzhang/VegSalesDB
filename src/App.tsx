import { useEffect, useState, useRef } from "react";
import * as React from "react";

import db from "./duckDB";

import AnnouncementHeader from "./components/header/AnnouncementHeader";
import StdAgGrid from "./components/grid/StdGrid";
import Shell from "./components/shell/Shell";

import {
  Tabs,
  Tab,
  Box,
  IconButton,
  ThemeProvider,
  createTheme,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import { initParquetTable } from "./lib/example/initTable";
import { IoInvertMode, IoLogoGithub, IoTerminalOutline } from "react-icons/io5";

import * as load from "./lib/load";

import "react-tabs/style/react-tabs.css";
import "./App.css";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  height: string | number;
  width: string | number;
  style?: React.CSSProperties;
}

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#90caf9",
    },
    background: {
      default: "#121212",
      paper: "#1d1d1d",
    },
    text: {
      primary: "#ffffff",
      secondary: "#b0b0b0",
    },
  },
});

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, height, width, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      className={`tab-panel${value !== index ? "-hidden" : ""}`}
      style={{ backgroundColor: "inherit" }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, height: height || "auto", width: width || "auto" }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface gridTab {
  label: string;
  content: JSX.Element;
}

// Add database operations
const dbOperations = {
  async create(tableName: string, data: Record<string, any>) {
    const connection = await db.connect();
    try {
      // Get column types first
      const columnTypesQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${tableName}';
      `;
      const columnTypes = await connection.query(columnTypesQuery);
      const typeMap = new Map(columnTypes.toArray().map(row => [row.column_name, row.data_type]));
      
      const columns = Object.keys(data);
      const values = columns.map(col => {
        const value = data[col];
        const type = typeMap.get(col);
        if (type === 'VARCHAR' || type === 'DATE') {
          return `'${value}'`;
        }
        return value;
      }).join(", ");

      await connection.query(`
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${values});
      `);
      return { success: true };
    } catch (error) {
      console.error("Error creating record:", error);
      return { success: false, error };
    } finally {
      await connection.close();
    }
  },

  async update(tableName: string, id: number, data: Record<string, any>) {
    const connection = await db.connect();
    try {
      // Get column types first
      const columnTypesQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '${tableName}';
      `;
      const columnTypes = await connection.query(columnTypesQuery);
      const typeMap = new Map(columnTypes.toArray().map(row => [row.column_name, row.data_type]));
      
      const updates = Object.entries(data)
        .map(([key, value]) => {
          const type = typeMap.get(key);
          const formattedValue = type === 'VARCHAR' || type === 'DATE' ? `'${value}'` : value;
          return `${key} = ${formattedValue}`;
        })
        .join(", ");

      await connection.query(`
        UPDATE ${tableName}
        SET ${updates}
        WHERE id = ${id};
      `);
      return { success: true };
    } catch (error) {
      console.error("Error updating record:", error);
      return { success: false, error };
    } finally {
      await connection.close();
    }
  },

  async delete(tableName: string, id: number) {
    const connection = await db.connect();
    try {
      await connection.query(`
        DELETE FROM ${tableName}
        WHERE id = ${id};
      `);
      return { success: true };
    } catch (error) {
      console.error("Error deleting record:", error);
      return { success: false, error };
    } finally {
      await connection.close();
    }
  }
};

const App: React.FC = () => {
  const [tabData, setTabData] = useState<gridTab[]>([]);
  const [value, setValue] = React.useState(1);
  const [monoValue, setMonoValue] = React.useState(1);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [isShellVisible, setIsShellVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  initParquetTable("./sales_transactions.parquet", "sales");

  useEffect(() => {
    const userPrefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    setDarkMode(userPrefersDark);
  }, []);

  useEffect(() => {
    const rootElement = document.getElementById("root");
    if (rootElement) {
      if (announcementVisible) {
        rootElement.classList.add("announcement-visible");
      } else {
        rootElement.classList.remove("announcement-visible");
      }
    }
  }, [announcementVisible]);

  useEffect(() => {
    const tabData = [
      {
        label: "0 - Sample",
        content: (
          <StdAgGrid 
            tabName="Tab1" 
            darkMode={darkMode} 
            tableName="sales"
          />
        ),
      },
    ];
    setTabData(tabData);
  }, []);

  useEffect(() => {
    setTabData((prevTabData) =>
      prevTabData.map((tab) => ({
        ...tab,
        content: React.cloneElement(tab.content, { 
          darkMode,
        }),
      })),
    );
  }, [darkMode]);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  }

  const onClickAddTab = () => {
    fileInputRef.current?.click();
  };

  const handleAddTab = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target.files?.[0];
    const newIndex = tabData.length;
    const tableName = `table${newIndex + 1}`;

    event.target.value = "";

    if (file) {
      if (file.name.endsWith(".csv")) {
        await load.CSV(file, tableName);
      } else if (file.name.endsWith(".xlsx")) {
        await load.Excel(file, tableName);
      } else if (file.name.endsWith(".parquet")) {
        await load.Parquet(file, tableName);
      }
      const newTab = {
        label: `${monoValue} - ${file.name}`,
        content: (
          <StdAgGrid
            tabName={`Tab${newIndex + 1}`}
            darkMode={darkMode}
            tableName={tableName}
          />
        ),
      };
      setTabData([...tabData, newTab]);
      setValue(newIndex + 1);
      setMonoValue((prev) => prev + 1);
    }
  };

  const handleCloseTab = async (index: number) => {
    setTabData((prevTabData) => prevTabData.filter((_, i) => i !== index));
    if (value >= index) {
      setValue((prevValue) => (prevValue === 0 ? 0 : prevValue - 1));
    }
    const c = await db.connect();
    await c.query(`
      DROP TABLE table${index + 1};
    `);
    await c.close();
  };

  const renderTabs = () => {
    return (
      <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
        <Tooltip title="Import an Excel, CSV, or Parquet file" arrow>
          <IconButton
            onClick={onClickAddTab}
            aria-label="add tab"
            style={{
              height: "40px",
              outline: "none",
              marginTop: "5px",
            }}
          >
            <AddIcon style={{ color: darkMode ? "white" : "gray" }} />
          </IconButton>
        </Tooltip>
        {tabData.map((tab, index) => (
          <Tab
            key={index}
            style={{ outline: "none" }}
            label={
              <div>
                {tab.label}
                <Tooltip title="Close tab" arrow>
                  <IconButton
                    style={{
                      color: darkMode ? "white" : "gray",
                      outline: "none",
                      borderRadius: "50%",
                      padding: "0px",
                      marginLeft: "10px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(index);
                    }}
                  >
                    <CloseIcon style={{ fontSize: "20px" }} />
                  </IconButton>
                </Tooltip>
              </div>
            }
            {...a11yProps(index)}
          />
        ))}
      </Tabs>
    );
  };

  const renderTabPanels = () => {
    return tabData.map((tab, index) => (
      <CustomTabPanel
        key={index}
        value={value}
        index={index + 1}
        height={"90%"}
        width={"95%"}
      >
        <div style={{ marginTop: -20, height: "95%" }}>{tab.content}</div>
      </CustomTabPanel>
    ));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleAnnouncementClose = () => {
    setAnnouncementVisible(false);
  };

  const toggleShellVisibility = () => {
    setIsShellVisible(!isShellVisible);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <div className={`app-container ${announcementVisible ? "announcement-visible" : ""}`}>
        <AnnouncementHeader
          darkMode={darkMode}
          message={
            <>
              👋 Welcome! Click the + button to import any CSV, Excel, or
              Parquet files to get started.
            </>
          }
          onClose={handleAnnouncementClose}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 20px",
            backgroundColor: "#1d1d1d",
            color: "#ffffff",
            borderBottom: "1px solid #fff",
            position: "sticky",
            zIndex: 1000,
            top: 0,
          }}
        >
          <h1 className="app-title" style={{ margin: 0, fontSize: "38px", padding: "5px" }}>
            Advanced Database Demo - Display of Vegetable Category Product Sales Database
          </h1>
          <div style={{ display: "inline-block", flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: "25px", height: "40px", display: "inline-block", cursor: "pointer", marginTop: "5px" }}>
              <IoTerminalOutline onClick={toggleShellVisibility} />
            </div>
            <div style={{ fontSize: "25px", height: "40px", display: "inline-block", cursor: "pointer", marginLeft: "10px" }}>
              <IoInvertMode onClick={toggleDarkMode} />
            </div>
          </div>

          <div style={{ fontSize: "25px", height: "40px", display: "inline-block", cursor: "pointer", marginLeft: "10px" }}>
            {isShellVisible && (
              <div>
                <Shell />
              </div>
            )}
          </div>
        </Box>
        <div>
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              border: "1px solid gray",
              borderRadius: "10px",
              margin: "30px auto",
              width: "90%",
            }}
          >
            <Box sx={{ borderBottom: 0.5, borderColor: darkMode ? "divider" : "gray" }}>
              {renderTabs()}
            </Box>
            {renderTabPanels()}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".csv,.xlsx,.parquet"
              onChange={handleAddTab}
            />
          </Box>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;