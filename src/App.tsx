import React, { useState, useEffect, useCallback } from "react";
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logoutUser, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { Ficha, FichaTipo, FichaContent } from "./types";
import { FichaCard } from "./components/FichaCard";
import { GlobalSearchBar } from "./components/GlobalSearchBar";
import { TimelineEras } from "./components/TimelineEras";
import { TimelineFullView } from "./components/TimelineFullView";
import { CategoryPieChart } from "./components/CategoryPieChart";
import { SAMPLE_FICHAS } from "./lib/sampleFichas";
import { downloadFichasAsZip } from "./lib/mdExporter";
import { fichaMatchesQuery } from "./lib/searchEngine";
import { parseResponseJson } from "./lib/api";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, 
  Plus, 
  Search, 
  LogOut, 
  LogIn, 
  Trash2, 
  Sparkles, 
  History, 
  Star, 
  User as UserIcon, 
  ChevronRight, 
  ChevronLeft, 
  PanelLeftClose, 
  PanelLeft, 
  PanelRightClose, 
  PanelRight, 
  Layers, 
  BookOpen, 
  FileText, 
  Info, 
  X, 
  PlusCircle, 
  FolderOpen, 
  Youtube, 
  Database, 
  RefreshCw, 
  Folder, 
  FolderPlus, 
  ArrowLeft, 
  Check, 
  Loader2, 
  Download, 
  Cloud, 
  Laptop, 
  Calendar, 
  PieChart as PieChartIcon, 
  Archive, 
  CheckSquare, 
  Square, 
  CheckCircle2 
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // SaaS states
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [activeFicha, setActiveFicha] = useState<Ficha | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | FichaTipo>("all");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth < 1024;
  });
  const [historyVisualTab, setHistoryVisualTab] = useState<"distribution" | "timeline">(() => {
    return (localStorage.getItem("history_visual_tab") as "distribution" | "timeline") || "distribution";
  });

  // Batch export states
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedFichaIds, setSelectedFichaIds] = useState<Set<string>>(new Set());
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [batchToast, setBatchToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Form states and auto-save draft definitions
  const [activeTab, setActiveTab] = useState<FichaTipo>(() => (localStorage.getItem("draft_activeTab") as FichaTipo) || "artista");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [errorBox, setErrorBox] = useState<string | null>(null);

  // Artist inputs with draft retrieval
  const [artistaNome, setArtistaNome] = useState(() => localStorage.getItem("draft_artistaNome") || "");
  const [artistaEra, setArtistaEra] = useState(() => localStorage.getItem("draft_artistaEra") || "");
  const [artistaNac, setArtistaNac] = useState(() => localStorage.getItem("draft_artistaNac") || "");
  const [artistaInstr, setArtistaInstr] = useState(() => localStorage.getItem("draft_artistaInstr") || "");
  const [artistaGeneros, setArtistaGeneros] = useState(() => localStorage.getItem("draft_artistaGeneros") || "");
  const [artistaExtra, setArtistaExtra] = useState(() => localStorage.getItem("draft_artistaExtra") || "");

  // Movement inputs with draft retrieval
  const [movNome, setMovNome] = useState(() => localStorage.getItem("draft_movNome") || "");
  const [movPeriodo, setMovPeriodo] = useState(() => localStorage.getItem("draft_movPeriodo") || "");
  const [movOrigem, setMovOrigem] = useState(() => localStorage.getItem("draft_movOrigem") || "");
  const [movFiguras, setMovFiguras] = useState(() => localStorage.getItem("draft_movFiguras") || "");
  const [movExtra, setMovExtra] = useState(() => localStorage.getItem("draft_movExtra") || "");

  // Music inputs with draft retrieval
  const [musTitulo, setMusTitulo] = useState(() => localStorage.getItem("draft_musTitulo") || "");
  const [musArtista, setMusArtista] = useState(() => localStorage.getItem("draft_musArtista") || "");
  const [musAno, setMusAno] = useState(() => localStorage.getItem("draft_musAno") || "");
  const [musGenero, setMusGenero] = useState(() => localStorage.getItem("draft_musGenero") || "");
  const [musExtra, setMusExtra] = useState(() => localStorage.getItem("draft_musExtra") || "");

  // Script inputs with draft retrieval
  const [rotTema, setRotTema] = useState(() => localStorage.getItem("draft_rotTema") || "");
  const [rotEra, setRotEra] = useState(() => localStorage.getItem("draft_rotEra") || "");
  const [rotFormato, setRotFormato] = useState(() => localStorage.getItem("draft_rotFormato") || "Vídeo longo · YouTube");
  const [rotExtra, setRotExtra] = useState(() => localStorage.getItem("draft_rotExtra") || "");

  // Instrument inputs with draft retrieval
  const [instNome, setInstNome] = useState(() => localStorage.getItem("draft_instNome") || "");
  const [instFamilia, setInstFamilia] = useState(() => localStorage.getItem("draft_instFamilia") || "");
  const [instOrigem, setInstOrigem] = useState(() => localStorage.getItem("draft_instOrigem") || "");
  const [instConstrutores, setInstConstrutores] = useState(() => localStorage.getItem("draft_instConstrutores") || "");
  const [instExtra, setInstExtra] = useState(() => localStorage.getItem("draft_instExtra") || "");

  // YouTube source input with draft retrieval
  const [youtubeUrl, setYoutubeUrl] = useState(() => localStorage.getItem("draft_youtubeUrl") || "");

  // Auto-Save Effect: Runs dynamically to ensure no character is ever lost across actions or session closing
  useEffect(() => {
    localStorage.setItem("draft_activeTab", activeTab);
    localStorage.setItem("draft_artistaNome", artistaNome);
    localStorage.setItem("draft_artistaEra", artistaEra);
    localStorage.setItem("draft_artistaNac", artistaNac);
    localStorage.setItem("draft_artistaInstr", artistaInstr);
    localStorage.setItem("draft_artistaGeneros", artistaGeneros);
    localStorage.setItem("draft_artistaExtra", artistaExtra);

    localStorage.setItem("draft_movNome", movNome);
    localStorage.setItem("draft_movPeriodo", movPeriodo);
    localStorage.setItem("draft_movOrigem", movOrigem);
    localStorage.setItem("draft_movFiguras", movFiguras);
    localStorage.setItem("draft_movExtra", movExtra);

    localStorage.setItem("draft_musTitulo", musTitulo);
    localStorage.setItem("draft_musArtista", musArtista);
    localStorage.setItem("draft_musAno", musAno);
    localStorage.setItem("draft_musGenero", musGenero);
    localStorage.setItem("draft_musExtra", musExtra);

    localStorage.setItem("draft_rotTema", rotTema);
    localStorage.setItem("draft_rotEra", rotEra);
    localStorage.setItem("draft_rotFormato", rotFormato);
    localStorage.setItem("draft_rotExtra", rotExtra);

    localStorage.setItem("draft_instNome", instNome);
    localStorage.setItem("draft_instFamilia", instFamilia);
    localStorage.setItem("draft_instOrigem", instOrigem);
    localStorage.setItem("draft_instConstrutores", instConstrutores);
    localStorage.setItem("draft_instExtra", instExtra);

    localStorage.setItem("draft_youtubeUrl", youtubeUrl);
  }, [
    activeTab,
    artistaNome, artistaEra, artistaNac, artistaInstr, artistaGeneros, artistaExtra,
    movNome, movPeriodo, movOrigem, movFiguras, movExtra,
    musTitulo, musArtista, musAno, musGenero, musExtra,
    rotTema, rotEra, rotFormato, rotExtra,
    instNome, instFamilia, instOrigem, instConstrutores, instExtra,
    youtubeUrl
  ]);

  // Obsidian Vault state variables & sync managers
  const [isTimelineFullViewOpen, setIsTimelineFullViewOpen] = useState(false);
  const [isObsidianCollapsed, setIsObsidianCollapsed] = useState(true);
  const [obsidianVaultPath, setObsidianVaultPath] = useState(() => localStorage.getItem("obsidian_vault_path") || "obsidian");
  const [localVaultPath, setLocalVaultPath] = useState(() => localStorage.getItem("obsidian_vault_path") || "obsidian");
  const [obsidianStatus, setObsidianStatus] = useState<{
    loaded: boolean;
    vaultExists: boolean;
    vaultPathResolved: string;
    folderStatus: Record<string, boolean>;
  } | null>(null);
  const [isCheckingObsidian, setIsCheckingObsidian] = useState(false);
  const [panelObsidianConnOpen, setPanelObsidianConnOpen] = useState(true);
  const [panelObsidianExploreOpen, setPanelObsidianExploreOpen] = useState(true);
  const [panelObsidianTemplatesOpen, setPanelObsidianTemplatesOpen] = useState(false);

  const checkObsidianStatus = useCallback(async (customVault?: string) => {
    setIsCheckingObsidian(true);
    try {
      const response = await fetch("/api/obsidian/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultPath: customVault !== undefined ? customVault : (localStorage.getItem("obsidian_vault_path") || "obsidian"),
        }),
      });
      const data = await parseResponseJson(response);
      setObsidianStatus({
        loaded: true,
        vaultExists: data.vaultExists,
        vaultPathResolved: data.vaultPathResolved,
        folderStatus: data.folderStatus || {},
      });
    } catch (err) {
      console.error("Erro ao checar status do Obsidian:", err);
    } finally {
      setIsCheckingObsidian(false);
    }
  }, []);

  const handleUpdateVaultPath = (value: string) => {
    setObsidianVaultPath(value);
    localStorage.setItem("obsidian_vault_path", value);
    checkObsidianStatus(value);
  };

  const handleCreateDefaultTemplatesLocal = async () => {
    if (!localDirHandle) {
      alert("Selecione primeiro uma pasta do seu computador para poder municiar o vault local com os templates!");
      return;
    }
    try {
      const templatesDirHandle = await localDirHandle.getDirectoryHandle("templates", { create: true });
      const { DEFAULT_TEMPLATES } = await import("./lib/templateEngine");
      
      const fileMappings = {
        artista: "Artista.md",
        movimento: "Movimento.md",
        musica: "Música.md",
        roteiro: "Roteiro.md",
        instrumento: "Instrumento.md"
      };

      for (const [key, filename] of Object.entries(fileMappings)) {
        const fileHandle = await templatesDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        const content = DEFAULT_TEMPLATES[key] || "";
        await writable.write(content);
        await writable.close();
      }

      // Re-scan local directory to parse new template files
      await scanNativeDirectory(localDirHandle);
      alert("Sucesso! Pasta 'templates' criada e sincronizada. Os templates de Artistas, Movimentos, Músicas, Roteiros e Instrumentos já foram identificados no seu computador.");
    } catch (err: any) {
      console.error("Erro ao criar templates locais:", err);
      alert("Impossível criar pasta de templates localmente: " + err.message);
    }
  };

  const handleCreateDefaultTemplatesServer = async () => {
    try {
      const response = await fetch("/api/obsidian/templates/create-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: obsidianVaultPath }),
      });
      const resData = await parseResponseJson(response);
      if (resData.success) {
        await loadServerTemplates();
        alert("Sucesso! Pasta 'templates' criada no servidor virtual e populada com os templates recomendados.");
      } else {
        alert("Incapaz de gerar templates estruturais no Servidor.");
      }
    } catch (e: any) {
      console.error("Erro ao criar templates no servidor:", e);
      alert("Erro de API ao criar templates no servidor: " + e.message);
    }
  };

  // Local native directory selection (on user computer)
  const [vaultMode, setVaultMode] = useState<"server" | "local">(() => {
    return (localStorage.getItem("obsidian_vault_mode") as "server" | "local") || "server";
  });
  const [localDirHandle, setLocalDirHandle] = useState<any | null>(null);
  const [localDirName, setLocalDirName] = useState<string>(() => localStorage.getItem("local_dir_name") || "");
  const [indexedLocalFiles, setIndexedLocalFiles] = useState<{
    name: string;
    relativePath: string;
    size: number;
    parentFolder: string;
    handle?: any;
    fileObject?: File;
  }[]>([]);
  const [selectedLocalFile, setSelectedLocalFile] = useState<string | null>(null);
  const [localFileContentView, setLocalFileContentView] = useState<string>("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const [localPickerError, setLocalPickerError] = useState("");
  const [selectedSubfolderTab, setSelectedSubfolderTab] = useState<string>("Tudo");

  // Obsidian templates states
  const [vaultTemplates, setVaultTemplates] = useState<Record<string, { name: string; content: string }>>({});
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);

  const loadServerTemplates = async (pathOverride?: string) => {
    setIsTemplatesLoading(true);
    try {
      const response = await fetch("/api/obsidian/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultPath: pathOverride || obsidianVaultPath }),
      });
      const resData = await parseResponseJson(response);
      if (resData.success && resData.exists) {
        setVaultTemplates(resData.templates || {});
      } else {
        setVaultTemplates({});
      }
    } catch (e) {
      console.warn("Erro ao carregar templates do servidor:", e);
    } finally {
      setIsTemplatesLoading(false);
    }
  };

  useEffect(() => {
    (window as any).localDirectoryHandle = localDirHandle;
  }, [localDirHandle]);

  useEffect(() => {
    (window as any).refreshLocalExplorer = () => {
      if (localDirHandle) {
        scanNativeDirectory(localDirHandle);
      }
    };
  }, [localDirHandle]);

  // Load server templates on start or path/mode changes
  useEffect(() => {
    if (vaultMode === "server") {
      loadServerTemplates();
    }
  }, [vaultMode, obsidianVaultPath]);

  const scanNativeDirectory = async (dirHandle: any) => {
    setIsRefreshingLocal(true);
    setLocalPickerError("");
    try {
      const files: any[] = [];
      const foundTemplates: Record<string, { name: string; content: string }> = {};
      
      async function recursiveScan(handle: any, currentPath = "") {
        for await (const entry of handle.values()) {
          const pathLower = currentPath ? `${currentPath}/${entry.name}`.toLowerCase() : entry.name.toLowerCase();
          
          if (entry.kind === "file") {
            if (entry.name.endsWith(".md") || entry.name.endsWith(".html")) {
              const file = await entry.getFile();
              const segments = currentPath.split("/");
              const parentFolder = segments[segments.length - 1] || "Raiz";
              const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              
              // Se for arquivador markdown sob pasta templates do PC local do usuário
              if (pathLower.includes("templates") && entry.name.endsWith(".md")) {
                const content = await file.text();
                const term = entry.name.toLowerCase().replace(".md", "").replace("template", "").trim();
                let tipo = "";
                if (term.includes("artista")) tipo = "artista";
                else if (term.includes("movimento")) tipo = "movimento";
                else if (term.includes("musica") || term.includes("música")) tipo = "musica";
                else if (term.includes("roteiro")) tipo = "roteiro";
                else if (term.includes("instrumento")) tipo = "instrumento";
                
                if (tipo) {
                  foundTemplates[tipo] = { name: entry.name, content };
                }
              }

              files.push({
                name: entry.name,
                relativePath: relPath,
                size: file.size,
                parentFolder: ["Artista", "Movimento", "Música", "Roteiro", "Instrumento"].includes(parentFolder) ? parentFolder : "Raiz",
                handle: entry
              });
            }
          } else if (entry.kind === "directory") {
            const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            await recursiveScan(entry, nextPath);
          }
        }
      }

      await recursiveScan(dirHandle);
      setIndexedLocalFiles(files);
      setVaultTemplates(foundTemplates);
      setLocalDirName(dirHandle.name);
      localStorage.setItem("local_dir_name", dirHandle.name);
    } catch (err: any) {
      console.error("Erro ao analisar a pasta local nativa:", err);
      setLocalPickerError("Acesso negado ou erro ao ler pasta local: " + err.message);
    } finally {
      setIsRefreshingLocal(false);
    }
  };

  const isCrossOriginIframe = (): boolean => {
    try {
      if (window.self === window.top) return false;
      void window.top?.location.origin;
      return false;
    } catch {
      return true;
    }
  };

  const handleSelectNativeDirectory = async () => {
    setLocalPickerError("");

    if (typeof (window as any).showDirectoryPicker !== "function") {
      setLocalPickerError("Seu navegador não suporta a API nativa de pasta direta. Utilize o botão 'Carregar Pasta (Análise)' logo abaixo.");
      return;
    }

    if (isCrossOriginIframe()) {
      setLocalPickerError("IFRAME_BLOCKED");
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      setLocalDirHandle(handle);
      await scanNativeDirectory(handle);
      setVaultMode("local");
      localStorage.setItem("obsidian_vault_mode", "local");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User cancelled the folder picker dialog
        return;
      }
      if (err?.name === "SecurityError") {
        setLocalPickerError("IFRAME_BLOCKED");
        return;
      }
      console.warn("Não foi possível selecionar o diretório:", err);
      setLocalPickerError(err?.message || "Não foi possível acessar a pasta selecionada.");
    }
  };

  const handleLocalFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsRefreshingLocal(true);
    setLocalPickerError("");
    try {
      const parsedFiles: any[] = [];
      const foundTemplates: Record<string, { name: string; content: string }> = {};
      const firstPath = filesList[0].webkitRelativePath || "";
      const folderRootName = firstPath.split("/")[0] || "Pasta Local";

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const relPath = file.webkitRelativePath || file.name;
        const pathLower = relPath.toLowerCase();

        if (file.name.endsWith(".md") || file.name.endsWith(".html")) {
          const pathSegments = relPath.split("/");
          const parentFolder = pathSegments[pathSegments.length - 2] || "Raiz";

          if (pathLower.includes("templates") && file.name.endsWith(".md")) {
            const content = await file.text();
            const term = file.name.toLowerCase().replace(".md", "").replace("template", "").trim();
            let tipo = "";
            if (term.includes("artista")) tipo = "artista";
            else if (term.includes("movimento")) tipo = "movimento";
            else if (term.includes("musica") || term.includes("música")) tipo = "musica";
            else if (term.includes("roteiro")) tipo = "roteiro";
            else if (term.includes("instrumento")) tipo = "instrumento";

            if (tipo) {
              foundTemplates[tipo] = { name: file.name, content };
            }
          }

          parsedFiles.push({
            name: file.name,
            relativePath: relPath.includes("/") ? relPath.split("/").slice(1).join("/") : relPath,
            size: file.size,
            parentFolder: ["Artista", "Movimento", "Música", "Roteiro", "Instrumento"].includes(parentFolder) ? parentFolder : "Raiz",
            fileObject: file
          });
        }
      }

      setIndexedLocalFiles(parsedFiles);
      if (Object.keys(foundTemplates).length > 0) {
        setVaultTemplates(foundTemplates);
      }
      setLocalDirName(folderRootName);
      localStorage.setItem("local_dir_name", folderRootName);
      setLocalDirHandle(null); // file upload mode is read-only index basis
      setVaultMode("local");
      localStorage.setItem("obsidian_vault_mode", "local");
    } catch (err: any) {
      setLocalPickerError("Falha ao carregar a pasta: " + (err?.message || "Erro desconhecido"));
    } finally {
      setIsRefreshingLocal(false);
      e.target.value = "";
    }
  };

  const handleViewLocalFile = async (fileObj: any) => {
    setSelectedLocalFile(fileObj.relativePath);
    setLocalFileContentView("Carregando...");
    try {
      if (fileObj.handle) {
        const file = await fileObj.handle.getFile();
        const text = await file.text();
        setLocalFileContentView(text);
      } else if (fileObj.fileObject) {
        const text = await fileObj.fileObject.text();
        setLocalFileContentView(text);
      } else {
        setLocalFileContentView("Não foi possível ler o arquivo.");
      }
    } catch (err: any) {
      setLocalFileContentView(`Erro ao ler o arquivo: ${err.message}`);
    }
  };

  // Interactive folder browser states & functions
  const [isBrowsingFolders, setIsBrowsingFolders] = useState(false);
  const [browseCurrentPath, setBrowseCurrentPath] = useState(".");
  const [browseDirs, setBrowseDirs] = useState<string[]>([]);
  const [browseParent, setBrowseParent] = useState<string | null>(null);
  const [isBrowsingLoading, setIsBrowsingLoading] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const [createDirError, setCreateDirError] = useState("");

  const loadDirectoryList = useCallback(async (pathStr: string) => {
    setIsBrowsingLoading(true);
    setCreateDirError("");
    try {
      const response = await fetch("/api/obsidian/list-dirs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePath: pathStr }),
      });
      const data = await parseResponseJson(response);
      setBrowseCurrentPath(data.relativeCurrentPath || ".");
      setBrowseParent(data.parent);
      setBrowseDirs(data.dirs || []);
    } catch (err) {
      console.error("Erro ao listar diretórios:", err);
    } finally {
      setIsBrowsingLoading(false);
    }
  }, []);

  const handleCreateDirectory = async () => {
    if (!newDirName.trim()) return;
    setCreateDirError("");
    try {
      const response = await fetch("/api/obsidian/create-dir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPath: browseCurrentPath, dirName: newDirName.trim() }),
      });
      await parseResponseJson(response);
      setNewDirName("");
      // Reload list for current path
      loadDirectoryList(browseCurrentPath);
    } catch (err: any) {
      setCreateDirError(err.message || "Erro de rede ao criar pasta.");
    }
  };

  const handleOpenFolderBrowser = () => {
    setIsBrowsingFolders(true);
    loadDirectoryList(obsidianVaultPath || ".");
  };

  const handleSelectBrowsedFolder = (chosenPath: string) => {
    handleUpdateVaultPath(chosenPath);
    setIsBrowsingFolders(false);
  };

  const handleDownloadVault = () => {
    const downloadUrl = `/api/obsidian/download?vaultPath=${encodeURIComponent(obsidianVaultPath)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `${obsidianVaultPath.replace(/[^a-zA-Z0-9]/g, "_") || "obsidian_vault"}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setLocalVaultPath(obsidianVaultPath);
  }, [obsidianVaultPath]);

  useEffect(() => {
    checkObsidianStatus();
  }, [checkObsidianStatus]);

  // Listening to Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetching data
  const fetchFichas = useCallback(async (currentUser: User | null) => {
    try {
      if (currentUser) {
        // Authenticated users fetch from Firestore queries (Secured by rules)
        const path = "fichas";
        try {
          const q = query(collection(db, path), where("userId", "==", currentUser.uid));
          const snapshot = await getDocs(q);
          const list: Ficha[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Ficha);
          });
          // Sort by date descending
          list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setFichas(list);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      } else {
        // Guest user fetches from LocalStorage
        const local = localStorage.getItem("fichas_musicais");
        if (local) {
          try {
            const list = JSON.parse(local) as Ficha[];
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setFichas(list);
          } catch (e) {
            console.error("Erro ao analisar localstorage:", e);
            setFichas(SAMPLE_FICHAS);
          }
        } else {
          // Initialize guest with sample study cards across all 5 categories
          localStorage.setItem("fichas_musicais", JSON.stringify(SAMPLE_FICHAS));
          setFichas(SAMPLE_FICHAS);
        }
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar fichas:", err);
    }
  }, []);

  const handleLoadSamples = () => {
    const list = [...SAMPLE_FICHAS];
    setFichas(list);
    localStorage.setItem("fichas_musicais", JSON.stringify(list));
    if (list.length > 0) {
      setActiveFicha(list[0]);
    }
  };

  // Sync list based on Auth changes
  useEffect(() => {
    if (!authChecking) {
      fetchFichas(user);
    }
  }, [user, authChecking, fetchFichas]);

  // Sync local data to account on login if user accepts
  const handleSignIn = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        // Load any local guest sheets and ask to migrate
        const local = localStorage.getItem("fichas_musicais");
        if (local) {
          const guestFichas = JSON.parse(local) as Ficha[];
          if (guestFichas.length > 0) {
            const confirmImport = window.confirm(
              `Você possui ${guestFichas.length} fichas geradas offline no navegador. Deseja importá-las para sua nuvem do SaaS?`
            );
            if (confirmImport) {
              const path = "fichas";
              for (const f of guestFichas) {
                const updatedFicha = {
                  ...f,
                  userId: loggedUser.uid,
                  updatedAt: new Date().toISOString(),
                };
                try {
                  await setDoc(doc(db, path, f.id), updatedFicha);
                } catch (error) {
                  console.error("Erro ao migrar ficha:", error);
                }
              }
              localStorage.removeItem("fichas_musicais");
            }
          }
        }
        await fetchFichas(loggedUser);
      }
    } catch (err: any) {
      alert("O cancelamento ou falha ocorreu na autenticação.");
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Deseja realmente sair da sua conta?")) {
      await logoutUser();
      setActiveFicha(null);
    }
  };

  // Simulating loading steps beautifully like original template, but linked to API
  const startLoadingAnimation = () => {
    setGenerationStep(0);
    const intervals = [1000, 2400, 3800, 5000];
    intervals.forEach((time, index) => {
      setTimeout(() => {
        setGenerationStep(index + 1);
      }, time);
    });
  };

  const handleGenerate = async () => {
    // Validate current fields
    let isValid = false;
    let requestPayload: any = {};

    if (activeTab === "artista") {
      if (!artistaNome.trim()) return;
      isValid = true;
      requestPayload = {
        nome: artistaNome,
        era: artistaEra,
        nac: artistaNac,
        instr: artistaInstr,
        generos: artistaGeneros,
        extra: artistaExtra,
      };
    } else if (activeTab === "movimento") {
      if (!movNome.trim()) return;
      isValid = true;
      requestPayload = {
        nome: movNome,
        periodo: movPeriodo,
        origem: movOrigem,
        figuras: movFiguras,
        extra: movExtra,
      };
    } else if (activeTab === "musica") {
      if (!musTitulo.trim()) return;
      isValid = true;
      requestPayload = {
        titulo: musTitulo,
        artista: musArtista,
        ano: musAno,
        genero: musGenero,
        extra: musExtra,
      };
    } else if (activeTab === "roteiro") {
      if (!rotTema.trim()) return;
      isValid = true;
      requestPayload = {
        tema: rotTema,
        era: rotEra,
        formato: rotFormato,
        extra: rotExtra,
      };
    } else if (activeTab === "instrumento") {
      if (!instNome.trim()) return;
      isValid = true;
      requestPayload = {
        nome: instNome,
        familia: instFamilia,
        origem: instOrigem,
        construtores: instConstrutores,
        extra: instExtra,
      };
    }

    if (youtubeUrl.trim()) {
      requestPayload.youtubeUrl = youtubeUrl;
    }

    if (!isValid) return;

    setIsGenerating(true);
    setErrorBox(null);
    setActiveFicha(null);
    startLoadingAnimation();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: activeTab, data: requestPayload }),
        signal: controller.signal,
      });

      const generatedData = await parseResponseJson(response);

      // Create new SaaS entry
      const newId = `f_${Date.now()}`;
      const newFicha: Ficha = {
        id: newId,
        userId: user ? user.uid : "guest",
        tipo: activeTab,
        titulo: String(generatedData.nome || generatedData.titulo || "Ficha Musical"),
        subtitulo: String(generatedData.nome_original || generatedData.periodo || generatedData.artista || "Estudo"),
        data: generatedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      };

      // Persistence
      if (user) {
        // Save to Firestore (secured by rules)
        const path = `fichas/${newId}`;
        try {
          await setDoc(doc(db, "fichas", newId), newFicha);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      } else {
        // Save to LocalStorage for offline guests
        const local = localStorage.getItem("fichas_musicais");
        const list = local ? JSON.parse(local) as Ficha[] : [];
        list.unshift(newFicha);
        localStorage.setItem("fichas_musicais", JSON.stringify(list));
      }

      setFichas((prev) => [newFicha, ...prev]);
      setActiveFicha(newFicha);
      resetForms();
    } catch (err: any) {
      console.error("Falha na geração:", err);
      let errorMsg = err.message || "Não foi possível conectar ao servidor IA.";
      if (err.name === "AbortError") {
        errorMsg = "⚠️ A requisição expirou (timeout). O servidor de IA demorou mais que o esperado para responder. Por favor, tente gerar novamente em instantes.";
      } else if (err.message === "Failed to fetch" || err.name === "TypeError") {
        errorMsg = "⚠️ Falha de comunicação com o servidor. Verifique sua conexão ou tente gerar novamente em alguns segundos.";
      }
      setErrorBox(errorMsg);
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const resetForms = () => {
    setArtistaNome(""); setArtistaEra(""); setArtistaNac(""); setArtistaInstr(""); setArtistaGeneros(""); setArtistaExtra("");
    setMovNome(""); setMovPeriodo(""); setMovOrigem(""); setMovFiguras(""); setMovExtra("");
    setMusTitulo(""); setMusArtista(""); setMusAno(""); setMusGenero(""); setMusExtra("");
    setRotTema(""); setRotEra(""); setRotExtra("");
    setInstNome(""); setInstFamilia(""); setInstOrigem(""); setInstConstrutores(""); setInstExtra("");
    setYoutubeUrl("");

    // Clear saved drafts from localStorage
    const keysToRemove = [
      "draft_artistaNome", "draft_artistaEra", "draft_artistaNac", "draft_artistaInstr", "draft_artistaGeneros", "draft_artistaExtra",
      "draft_movNome", "draft_movPeriodo", "draft_movOrigem", "draft_movFiguras", "draft_movExtra",
      "draft_musTitulo", "draft_musArtista", "draft_musAno", "draft_musGenero", "draft_musExtra",
      "draft_rotTema", "draft_rotEra", "draft_rotFormato", "draft_rotExtra",
      "draft_instNome", "draft_instFamilia", "draft_instOrigem", "draft_instConstrutores", "draft_instExtra",
      "draft_youtubeUrl"
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  };

  const getNomesFichasParaLinks = () => {
    const list: string[] = [];
    fichas.forEach(f => {
      if (f.titulo) list.push(f.titulo);
      if (f.subtitulo) list.push(f.subtitulo);
    });
    indexedLocalFiles.forEach(f => {
      const nameClean = f.name
        .replace(/\.md$/, "")
        .replace(/^ficha_(artista|movimento|musica|roteiro|instrumento)_/, "")
        .replace(/_/g, " ")
        .trim();
      const formatted = nameClean
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      if (formatted && formatted.length > 2) {
        list.push(formatted);
      }
    });
    return Array.from(new Set(list));
  };

  // Inline updates are automatically synchronized to Firestore/LocalStorage
  const handleFichaContentUpdate = async (updatedContent: any) => {
    if (!activeFicha) return;
    
    // Create copy with new timestamp
    const updatedFicha: Ficha = {
      ...activeFicha,
      titulo: String(updatedContent.nome || updatedContent.titulo || activeFicha.titulo),
      subtitulo: String(updatedContent.nome_original || updatedContent.periodo || updatedContent.artista || activeFicha.subtitulo),
      data: updatedContent,
      updatedAt: new Date().toISOString(),
    };

    // Update locally first
    setFichas((prev) => prev.map((f) => (f.id === activeFicha.id ? updatedFicha : f)));
    setActiveFicha(updatedFicha);

    // Persist
    if (user) {
      const path = `fichas/${activeFicha.id}`;
      try {
        await setDoc(doc(db, "fichas", activeFicha.id), updatedFicha);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const local = localStorage.getItem("fichas_musicais");
      if (local) {
        const list = JSON.parse(local) as Ficha[];
        const index = list.findIndex((f) => f.id === activeFicha.id);
        if (index !== -1) {
          list[index] = updatedFicha;
          localStorage.setItem("fichas_musicais", JSON.stringify(list));
        }
      }
    }
  };

  const handleDeleteFicha = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir permanentemente esta ficha?")) return;

    if (activeFicha?.id === id) {
      setActiveFicha(null);
    }

    setFichas((prev) => prev.filter((f) => f.id !== id));

    if (user) {
      const path = `fichas/${id}`;
      try {
        await deleteDoc(doc(db, "fichas", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const local = localStorage.getItem("fichas_musicais");
      if (local) {
        const list = JSON.parse(local) as Ficha[];
        const filtered = list.filter((f) => f.id !== id);
        localStorage.setItem("fichas_musicais", JSON.stringify(filtered));
      }
    }
  };

  const handleToggleFavorite = async (fichaToFav: Ficha, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...fichaToFav, isFavorite: !fichaToFav.isFavorite, updatedAt: new Date().toISOString() };
    
    setFichas((prev) => prev.map((f) => (f.id === fichaToFav.id ? updated : f)));
    if (activeFicha?.id === fichaToFav.id) {
      setActiveFicha(updated);
    }

    if (user) {
      const path = `fichas/${fichaToFav.id}`;
      try {
        await setDoc(doc(db, "fichas", fichaToFav.id), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const local = localStorage.getItem("fichas_musicais");
      if (local) {
        const list = JSON.parse(local) as Ficha[];
        const idx = list.findIndex((f) => f.id === fichaToFav.id);
        if (idx !== -1) {
          list[idx] = updated;
          localStorage.setItem("fichas_musicais", JSON.stringify(list));
        }
      }
    }
  };

  // Batch selection and ZIP export handlers
  const handleToggleSelectFicha = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFichaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredFichas.map((f) => f.id);
    const allFilteredAreSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedFichaIds.has(id));

    setSelectedFichaIds((prev) => {
      const next = new Set(prev);
      if (allFilteredAreSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedFichaIds(new Set());
  };

  const handleExportZip = async (explicitFichas?: Ficha[]) => {
    try {
      setIsExportingZip(true);
      let listToExport: Ficha[] = [];

      if (explicitFichas && explicitFichas.length > 0) {
        listToExport = explicitFichas;
      } else if (selectedFichaIds.size > 0) {
        listToExport = fichas.filter((f) => selectedFichaIds.has(f.id));
      } else {
        listToExport = filteredFichas;
      }

      if (listToExport.length === 0) {
        setBatchToast({
          type: "error",
          message: "Nenhuma ficha selecionada para exportação.",
        });
        setTimeout(() => setBatchToast(null), 4000);
        setIsExportingZip(false);
        return;
      }

      const allVaultTitles = fichas.map((f) => f.titulo).filter(Boolean);
      const { count, zipName } = await downloadFichasAsZip(listToExport, {
        allVaultTitles,
        includeIndex: true,
      });

      setBatchToast({
        type: "success",
        message: `${count} ficha(s) exportada(s) com sucesso em ${zipName}!`,
      });
      setTimeout(() => setBatchToast(null), 5000);
    } catch (err: any) {
      console.error("Erro ao exportar ZIP:", err);
      setBatchToast({
        type: "error",
        message: err.message || "Erro inesperado ao gerar exportação .ZIP",
      });
      setTimeout(() => setBatchToast(null), 5000);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Searching and category filtering (includes full internal ficha content)
  const filteredFichas = fichas.filter((f) => {
    const matchesSearch = fichaMatchesQuery(f, searchQuery);
    const matchesType = filterType === "all" || f.tipo === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen md:h-screen bg-[#09090b] text-[#ebdcb9] flex flex-col antialiased md:overflow-hidden">
      
      {/* SaaS Global Header */}
      <header className="border-b border-zinc-900/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 lg:gap-6 select-none">
        <div className="flex items-center justify-between gap-3.5 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-[#c4a35a] to-[#9c7e3f] rounded-lg flex items-center justify-center text-zinc-950 shadow-[0_0_20px_rgba(196,163,90,0.25)] transition duration-300 flex-shrink-0">
              <Music className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold">História & Música</span>
                <span className="font-mono text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Cloud SaaS</span>
              </div>
              <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-zinc-100 mt-0.5">Gerador de Fichas de Estudo IA</h1>
            </div>
          </div>

          {/* Mobile Auth status compact trigger */}
          <div className="flex lg:hidden items-center gap-2">
            {authChecking ? (
              <div className="h-8 w-24 bg-zinc-900 animate-pulse rounded" />
            ) : user ? (
              <div className="flex items-center gap-2 bg-zinc-900/40 p-1 pr-2 border border-zinc-800/80 rounded-lg">
                {user.photoURL ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={user.photoURL}
                    alt={user.displayName || "Usuário"}
                    className="w-7 h-7 rounded-md border border-zinc-800"
                  />
                ) : (
                  <div className="w-7 h-7 bg-[#c4a35a]/10 text-[#c4a35a] rounded-md flex items-center justify-center font-bold font-mono text-xs">
                    {user.displayName?.[0] || "U"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sair do SaaS"
                  className="text-zinc-500 hover:text-red-400 p-1 transition duration-150"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.12em] uppercase border border-[#c4a35a] bg-[#c4a35a]/10 hover:bg-[#c4a35a]/25 text-[#ebdcb9] font-semibold px-3 py-2 rounded-lg transition duration-200 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#c4a35a]" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Full-Content Search Bar */}
        <GlobalSearchBar
          fichas={fichas}
          onSelectFicha={(ficha) => setActiveFicha(ficha)}
          onApplyToSidebar={(q) => {
            setSearchQuery(q);
            setFilterType("all");
            setIsSidebarCollapsed(false);
            if (typeof window !== "undefined" && window.innerWidth < 1280) {
              setIsObsidianCollapsed(true);
            }
          }}
        />

        {/* Desktop Auth status block */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          {authChecking ? (
            <div className="h-9 w-32 bg-zinc-900 animate-pulse rounded" />
          ) : user ? (
            <div className="flex items-center gap-3 bg-zinc-900/40 p-1.5 pr-4 border border-zinc-800/80 rounded-lg">
              {user.photoURL ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={user.photoURL} 
                  alt={user.displayName || "Usuário"} 
                  className="w-8 h-8 rounded-md border border-zinc-800"
                />
              ) : (
                <div className="w-8 h-8 bg-[#c4a35a]/10 text-[#c4a35a] rounded-md flex items-center justify-center font-bold font-mono text-xs">
                  {user.displayName?.[0] || "U"}
                </div>
              )}
              <div className="hidden xl:block">
                <p className="text-[9px] text-[#c4a35a]/70 font-mono font-bold uppercase tracking-wider">Membro Premium</p>
                <p className="text-xs font-semibold leading-none text-zinc-300 mt-0.5">{user.displayName || user.email}</p>
              </div>
              <button 
                type="button"
                onClick={handleSignOut}
                title="Sair do SaaS"
                className="text-zinc-500 hover:text-red-400 p-1.5 ml-1 transition duration-150"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="hidden xl:block text-right mr-1">
                <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-[0.2em] block font-bold">Acesso Visitante</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Sincronização offline</span>
              </div>
              <button 
                type="button"
                onClick={handleSignIn}
                className="flex items-center gap-2 text-[10px] font-mono tracking-[0.15em] uppercase border border-[#c4a35a] bg-[#c4a35a]/10 hover:bg-[#c4a35a]/25 text-[#ebdcb9] font-semibold px-4.5 py-2.5 rounded-lg transition duration-200 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#c4a35a]" />
                Entrar com Google
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Guest Warning */}
      {!user && !authChecking && (
        <div className="bg-[#c4a35a]/5 border-b border-[#c4a35a]/15 px-6 py-3 flex items-center gap-2.5 text-xs text-zinc-300 font-sans select-none justify-center">
          <Info className="w-4 h-4 flex-shrink-0 text-[#c4a35a]" />
          <span>
            <strong>Modo Visitante</strong>: Suas fichas geradas serão salvas temporariamente neste navegador.
            <button type="button" onClick={handleSignIn} className="underline font-bold ml-1 text-[#ebdcb9] hover:text-[#c4a35a]">
               Faça login com sua conta Google
            </button> para salvar na nuvem e desfrutar do SaaS completo.
          </span>
        </div>
      )}

      {/* SaaS workspace layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-zinc-950/20">
        {/* Left Sidebar: History / Catalog */}
        <aside className={`border-b lg:border-b-0 lg:border-r border-zinc-900/90 bg-zinc-950/90 flex flex-col transition-all duration-300 origin-left flex-shrink-0 overflow-hidden ${
          !isSidebarCollapsed
            ? "w-full lg:w-[350px] h-[460px] lg:h-full opacity-100" 
            : "w-0 h-0 lg:h-full lg:w-0 overflow-hidden border-b-0 border-r-0 lg:border-r-0 opacity-0 pointer-events-none select-none"
        }`}>
          <div className="w-full lg:w-[350px] lg:min-w-[350px] lg:max-w-[350px] flex-1 flex flex-col min-h-0 bg-transparent animate-fade-in flex-shrink-0">
            <div className="p-4.5 border-b border-zinc-900/60 space-y-3.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#c4a35a]/90 font-extrabold block">Histórico de Estudos</span>
                  {fichas.length > 0 && (
                    <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">
                      {filteredFichas.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {fichas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMode((prev) => {
                          const next = !prev;
                          if (!next) {
                            setSelectedFichaIds(new Set());
                          }
                          return next;
                        });
                      }}
                      title={isBatchMode ? "Sair do modo de seleção em lote" : "Exportar fichas em lote (.ZIP contendo arquivos .md individuais)"}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        isBatchMode
                          ? "bg-[#c4a35a] text-zinc-950 shadow-sm"
                          : "text-zinc-400 hover:text-[#ebdcb9] hover:bg-zinc-900 border border-zinc-800/80 hover:border-[#c4a35a]/40"
                      }`}
                    >
                      <Archive className="w-3 h-3" />
                      <span>{isBatchMode ? "Fechar" : "Exportar .ZIP"}</span>
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={() => setIsSidebarCollapsed(true)}
                    title="Esconder Histórico"
                    className="text-zinc-500 hover:text-[#c4a35a] p-1.5 rounded hover:bg-zinc-900/50 transition cursor-pointer flex items-center justify-center"
                  >
                    <PanelLeftClose className="w-4 h-4 text-[#c4a35a]/85" />
                  </button>
                </div>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                </span>
                <input 
                  type="text" 
                  placeholder="Buscar por título ou conteúdo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 text-xs focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/50 outline-none text-zinc-100 placeholder-zinc-600 rounded-lg transition duration-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Limpar filtro"
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category filter pills - horizontal swipeable container to save space */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none pb-1.5 w-full whitespace-nowrap scroll-smooth">
                {(["all", "artista", "movimento", "musica", "instrumento", "roteiro"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded border transition-all duration-200 cursor-pointer flex-shrink-0 ${
                      filterType === t 
                        ? "border-[#c4a35a] bg-[#c4a35a]/10 text-[#ebdcb9] shadow-[0_0_8px_rgba(196,163,90,0.1)]" 
                        : "border-zinc-850 bg-zinc-900/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {t === "all" ? "Todos" : t === "musica" ? "Música" : t === "roteiro" ? "Roteiros" : t === "instrumento" ? "Instr." : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Analytics Selector: Rosca (Distribuição) & Linha do Tempo */}
            <div className="px-4 pb-3 flex-shrink-0 border-b border-zinc-900/40 space-y-2.5">
              {fichas.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center p-0.5 bg-zinc-900/80 border border-zinc-800/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryVisualTab("distribution");
                        localStorage.setItem("history_visual_tab", "distribution");
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        historyVisualTab === "distribution"
                          ? "bg-[#c4a35a]/20 text-[#ebdcb9] border border-[#c4a35a]/40 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                      }`}
                      title="Gráfico de Rosca: Distribuição por Categoria"
                    >
                      <PieChartIcon className="w-3 h-3 text-[#c4a35a]" />
                      <span>Distribuição</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryVisualTab("timeline");
                        localStorage.setItem("history_visual_tab", "timeline");
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        historyVisualTab === "timeline"
                          ? "bg-[#c4a35a]/20 text-[#ebdcb9] border border-[#c4a35a]/40 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                      }`}
                      title="Linha do Tempo: Cronologia das Eras"
                    >
                      <Calendar className="w-3 h-3 text-[#c4a35a]" />
                      <span>Cronologia</span>
                    </button>
                  </div>

                  <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-wider">
                    {historyVisualTab === "distribution" ? "Gráfico Recharts" : "Linha do Tempo"}
                  </span>
                </div>
              )}

              {historyVisualTab === "distribution" || fichas.length === 0 ? (
                <CategoryPieChart
                  fichas={fichas}
                  activeFilter={filterType}
                  onSelectCategory={(tipo) => setFilterType(tipo)}
                  onLoadSamples={handleLoadSamples}
                />
              ) : (
                <TimelineEras 
                  fichas={fichas}
                  activeFicha={activeFicha}
                  onSelectFicha={(f) => {
                    setActiveFicha(f);
                  }}
                  onOpenFullView={() => setIsTimelineFullViewOpen(true)}
                />
              )}
            </div>

            {/* Batch Export Control Panel */}
            {isBatchMode && (
              <div className="mx-3.5 my-2.5 p-3 rounded-xl bg-gradient-to-b from-[#181611] to-[#111113] border border-[#c4a35a]/40 shadow-xl flex-shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5 text-[#c4a35a]" />
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#ebdcb9]">
                      Exportação em Lote (.ZIP)
                    </span>
                  </div>
                  <span className="font-mono text-[8.5px] px-2 py-0.5 rounded-full bg-[#c4a35a]/15 text-[#ebdcb9] font-bold border border-[#c4a35a]/30">
                    {selectedFichaIds.size} de {filteredFichas.length} marcadas
                  </span>
                </div>

                <p className="text-[10px] text-zinc-400 font-sans leading-tight mb-2.5">
                  Selecione as fichas desejadas ou todas do filtro para baixar em um arquivo compactado <code className="text-[#ebdcb9]">.zip</code> com arquivos <code className="text-[#ebdcb9]">.md</code> individuais (com propriedades para Obsidian/Logseq).
                </p>

                {/* Batch Controls Row */}
                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="flex items-center gap-1.5 text-[8.5px] font-mono uppercase font-bold text-zinc-300 hover:text-[#ebdcb9] bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-700/80 hover:border-[#c4a35a]/50 px-2 py-1 rounded transition cursor-pointer"
                  >
                    <CheckSquare className="w-3 h-3 text-[#c4a35a]" />
                    {filteredFichas.length > 0 && filteredFichas.every((f) => selectedFichaIds.has(f.id))
                      ? "Desmarcar Todas"
                      : `Selecionar Todas (${filteredFichas.length})`}
                  </button>

                  {selectedFichaIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-[8.5px] font-mono uppercase text-zinc-500 hover:text-zinc-300 px-1.5 py-1 transition cursor-pointer"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {/* Main Export Button */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    disabled={isExportingZip || (selectedFichaIds.size === 0 && filteredFichas.length === 0)}
                    onClick={() => handleExportZip()}
                    className={`w-full py-2 px-3 rounded-lg font-mono text-[9.5px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-200 cursor-pointer shadow-md ${
                      selectedFichaIds.size > 0
                        ? "bg-[#c4a35a] hover:bg-[#d6b76c] text-zinc-950 font-black shadow-[0_0_12px_rgba(196,163,90,0.25)]"
                        : filteredFichas.length > 0
                        ? "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700"
                        : "bg-zinc-900 text-zinc-600 border border-zinc-850 cursor-not-allowed"
                    }`}
                  >
                    {isExportingZip ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                        <span>Compactando .ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {selectedFichaIds.size > 0
                            ? `Baixar ${selectedFichaIds.size} Selecionada${selectedFichaIds.size > 1 ? "s" : ""} (.ZIP)`
                            : `Baixar Todas Filtradas (${filteredFichas.length}) (.ZIP)`}
                        </span>
                      </>
                    )}
                  </button>

                  {selectedFichaIds.size > 0 && selectedFichaIds.size < filteredFichas.length && (
                    <button
                      type="button"
                      disabled={isExportingZip}
                      onClick={() => handleExportZip(filteredFichas)}
                      className="w-full py-1 text-center font-mono text-[8px] text-zinc-400 hover:text-[#ebdcb9] underline decoration-zinc-700 transition cursor-pointer"
                    >
                      Ou baixar todas as {filteredFichas.length} filtradas em .zip
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Batch Toast notification */}
            {batchToast && (
              <div className={`mx-3.5 my-2 p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-200 flex-shrink-0 ${
                batchToast.type === "success"
                  ? "bg-emerald-950/85 border-emerald-500/50 text-emerald-200"
                  : batchToast.type === "error"
                  ? "bg-red-950/85 border-red-500/50 text-red-200"
                  : "bg-zinc-900 border-zinc-700 text-zinc-200"
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  {batchToast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  {batchToast.type === "error" && <Info className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <span className="text-[9.5px] leading-tight break-words">{batchToast.message}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setBatchToast(null)} 
                  className="text-zinc-400 hover:text-white p-0.5 cursor-pointer flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* List items */}
            <div className="flex-1 overflow-y-auto sidebar-scrollable divide-y divide-zinc-900/45">
              {filteredFichas.length > 0 ? (
                filteredFichas.map((f) => {
                  const isSelected = selectedFichaIds.has(f.id);
                  return (
                    <div 
                      key={f.id}
                      onClick={() => {
                        if (isBatchMode) {
                          handleToggleSelectFicha(f.id);
                          setActiveFicha(f);
                        } else {
                          setActiveFicha(f);
                        }
                      }}
                      className={`p-3.5 flex items-start gap-3 transition cursor-pointer select-none group relative border-l-2 ${
                        isBatchMode && isSelected
                          ? "bg-[#c4a35a]/12 border-[#c4a35a] shadow-[inset_4px_0_0_rgba(196,163,90,0.3)] ring-1 ring-[#c4a35a]/25"
                          : activeFicha?.id === f.id 
                          ? "bg-zinc-900/55 border-[#c4a35a] shadow-[inset_4px_0_0_rgba(196,163,90,0.1)]" 
                          : "bg-transparent border-transparent hover:bg-zinc-900/25"
                      }`}
                    >
                      {/* Checkbox when in batch mode */}
                      {isBatchMode ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectFicha(f.id, e)}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                            isSelected
                              ? "bg-[#c4a35a] text-zinc-950 shadow-[0_0_8px_rgba(196,163,90,0.4)]"
                              : "bg-zinc-900 border border-zinc-700 hover:border-[#c4a35a]/70 text-transparent"
                          }`}
                          title={isSelected ? "Desmarcar ficha" : "Marcar ficha para exportação"}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3] text-zinc-950" />
                        </button>
                      ) : (
                        /* Symbol based on type */
                        <div className="mt-0.5 w-6 h-6 rounded bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                          {f.tipo === "artista" && <span title="Artista">🎭</span>}
                          {f.tipo === "movimento" && <span title="Movimento">🌊</span>}
                          {f.tipo === "musica" && <span title="Música">🎵</span>}
                          {f.tipo === "roteiro" && <span title="Roteiro">🎬</span>}
                          {f.tipo === "instrumento" && <span title="Instrumento">🎻</span>}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-1.5">
                          {isBatchMode && (
                            <span className="text-xs flex-shrink-0">
                              {f.tipo === "artista" && "🎭"}
                              {f.tipo === "movimento" && "🌊"}
                              {f.tipo === "musica" && "🎵"}
                              {f.tipo === "roteiro" && "🎬"}
                              {f.tipo === "instrumento" && "🎻"}
                            </span>
                          )}
                          <h4 className={`font-serif text-[13px] font-bold truncate transition duration-200 leading-snug ${
                            isSelected ? "text-[#ebdcb9]" : "text-zinc-100 group-hover:text-[#c4a35a]"
                          }`}>
                            {f.titulo}
                          </h4>
                        </div>
                        <p className="text-[11px] text-zinc-500 italic font-serif truncate mt-0.5 leading-tight">
                          {f.subtitulo}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-[7.5px] text-zinc-650 block uppercase tracking-wider font-bold">
                            {new Date(f.updatedAt).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="font-mono text-[7px] px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                            {f.tipo}
                          </span>
                        </div>
                      </div>

                      {/* Sidebar item controls */}
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-150 bg-transparent md:bg-zinc-950/90 pl-2 rounded">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(f, e)}
                          title={f.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          className="text-zinc-500 hover:text-[#c4a35a] p-1 transition"
                        >
                          <Star className={`w-3.5 h-3.5 ${f.isFavorite ? "fill-[#c4a35a] text-[#c4a35a]" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFicha(f.id, e)}
                          title="Excluir ficha"
                          className="text-zinc-500 hover:text-red-400 p-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-2 select-none">
                  <FolderOpen className="w-7 h-7 text-zinc-700 mx-auto stroke-[1.5]" />
                  <p className="text-xs text-zinc-500">Nenhuma ficha salva neste filtro.</p>
                </div>
              )}
            </div>

            {/* Persistent global buttons in sidebar footer */}
            <div className="p-3 border-t border-zinc-900 bg-zinc-950/90 flex-shrink-0 mt-auto space-y-2">
              {isBatchMode && (
                <button
                  type="button"
                  disabled={isExportingZip || (selectedFichaIds.size === 0 && filteredFichas.length === 0)}
                  onClick={() => handleExportZip()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#c4a35a] hover:bg-[#d6b76c] text-zinc-950 font-mono text-[9.5px] font-black uppercase tracking-wider transition duration-150 cursor-pointer shadow-[0_0_12px_rgba(196,163,90,0.25)]"
                >
                  {isExportingZip ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                      <span>Compactando .ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>
                        {selectedFichaIds.size > 0
                          ? `Baixar ${selectedFichaIds.size} em .ZIP`
                          : `Baixar ${filteredFichas.length} Filtradas em .ZIP`}
                      </span>
                    </>
                  )}
                </button>
              )}
              <button 
                type="button"
                onClick={() => setActiveFicha(null)}
                className="w-full flex items-center justify-center gap-2 border border-zinc-800 hover:border-[#c4a35a] py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-200 hover:text-[#ebdcb9] bg-zinc-900 hover:bg-[#c4a35a]/5 transition duration-200 rounded-lg cursor-pointer font-bold shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-[#c4a35a]" />
                Novo Estudo
              </button>
            </div>
          </div>
        </aside>

        {/* Content main workspace */}
        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto relative">
          
          {/* Main workspace control toolbar - statically positioned, never overlaps content */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-950/30 p-3 md:p-3.5 border border-zinc-900/60 rounded-xl mb-6 select-none">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold block">
                Painéis Auxiliares
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-850" />
              <span className="text-[10.5px] text-zinc-500 font-sans leading-none">
                Controle a exibição das barras de ferramentas lateral
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSidebarCollapsed((prev) => {
                    const next = !prev;
                    if (!next && window.innerWidth < 1280) {
                      setIsObsidianCollapsed(true);
                    }
                    return next;
                  });
                }}
                className={`flex items-center justify-center p-2.5 border rounded-lg transition-all duration-200 cursor-pointer ${
                  !isSidebarCollapsed 
                    ? "border-[#c4a35a] bg-[#c4a35a]/10 text-[#ebdcb9] shadow-[0_0_10px_rgba(196,163,90,0.05)]"
                    : "border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
                title={isSidebarCollapsed ? "Mostrar Histórico de Estudos" : "Ocultar Histórico"}
                aria-label={isSidebarCollapsed ? "Mostrar Histórico de Estudos" : "Ocultar Histórico"}
              >
                <PanelLeft className="w-4 h-4 text-[#c4a35a]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsObsidianCollapsed((prev) => {
                    const next = !prev;
                    if (!next && window.innerWidth < 1280) {
                      setIsSidebarCollapsed(true);
                    }
                    return next;
                  });
                }}
                className={`flex items-center justify-center p-2.5 border rounded-lg transition-all duration-200 cursor-pointer ${
                  !isObsidianCollapsed 
                    ? "border-purple-800 bg-purple-950/20 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                    : "border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-750 hover:text-purple-400"
                }`}
                title={isObsidianCollapsed ? "Mostrar Configurações do Obsidian" : "Ocultar Obsidian"}
                aria-label={isObsidianCollapsed ? "Mostrar Configurações do Obsidian" : "Ocultar Obsidian"}
              >
                <Database className="w-4 h-4 text-purple-400" />
              </button>
            </div>
          </div>
          
          {errorBox && (
            <div className="mb-6 bg-red-950/40 border border-red-900/60 text-red-200 text-xs px-4 py-3 rounded-lg flex items-center justify-between gap-4">
              <span className="leading-relaxed font-sans">{errorBox}</span>
              <button onClick={() => setErrorBox(null)} className="hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeFicha ? (
              // Form or active generated sheet review card
              <motion.div 
                key="active-ficha-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3.5">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setActiveFicha(null)}
                    className="text-xs text-[#c4a35a] hover:text-[#ebdcb9] transition font-mono font-bold uppercase tracking-wider"
                  >
                    ← Voltar aos Formulários
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-650" />
                  <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest font-bold">Visualizando Estudo</span>
                </div>
              </div>

              <FichaCard 
                ficha={activeFicha} 
                onUpdate={handleFichaContentUpdate}
                onToggleFavorite={() => {}}
                vaultTemplates={vaultTemplates}
                nomesFichasParaLinks={getNomesFichasParaLinks()}
                allFichas={fichas}
              />
            </motion.div>
          ) : isGenerating ? (
            // Beautiful interactive loading step animation
            <motion.div 
              key="is-generating-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl mx-auto w-full my-auto text-center py-16 space-y-8 select-none"
            >
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 border-2 border-zinc-905 border-t-[#c4a35a] rounded-full animate-spin"></div>
                <div className="absolute inset-4 rounded-full bg-zinc-950 flex items-center justify-center font-bold text-[#c4a35a] font-serif tracking-wider text-sm shadow-md">IA</div>
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-zinc-100">IA Musicóloga trabalhando...</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">Colhendo fontes bibliográficas, descrições estéticas, conexões e inovações técnicas para estruturar a sua ficha.</p>
              </div>

              {/* Progress Steps list */}
              <div className="max-w-xs mx-auto border border-zinc-900/80 bg-zinc-950/70 p-5 rounded-xl space-y-3.5 shadow-xl">
                {[
                  "Pesquisando conteúdo biográfico",
                  "Catalogando obras emblemáticas",
                  "Estruturando análises mecânicas",
                  "Formatando ganchos de roteiro"
                ].map((step, idx) => {
                  const isDone = generationStep > idx;
                  const isActive = generationStep === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3.5 text-left transition duration-300 ${
                        isDone ? "text-[#c4a35a]" : isActive ? "text-zinc-200 animate-pulse font-bold" : "text-zinc-700"
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold ${
                        isDone ? "border-[#c4a35a] bg-[#c4a35a]/10" : isActive ? "border-[#c4a35a]" : "border-zinc-800"
                      }`}>
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className="text-xs font-mono tracking-wider">{step}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            // Categorized sheet form inputs
            <motion.div 
              key="forms-input-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl mx-auto w-full"
            >
              
              <div className="mb-6.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#c4a35a] font-bold">Estágio de Criação</div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[8px] uppercase tracking-wider bg-emerald-950/20 px-2 py-0.5 border border-emerald-900/30 rounded shadow-[0_0_8px_rgba(52,211,153,0.04)] select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Rascunho Salvo</span>
                  </div>
                </div>
                <h2 className="font-serif text-2.5xl font-bold text-zinc-100">Criar Nova Ficha de Estudos</h2>
                <p className="text-xs text-zinc-400 leading-relaxed">Selecione a categoria desejada e preencha os parâmetros fundamentais. Nossa inteligência artificial gerará uma análise rica e detalhada.</p>
              </div>

              {/* Categorical Form Tabs input */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6 select-none">
                {[
                  { id: "artista", icon: "🎭", label: "Artista" },
                  { id: "movimento", icon: "🌊", label: "Movimento" },
                  { id: "musica", icon: "🎵", label: "Música Pivô" },
                  { id: "instrumento", icon: "🎻", label: "Instrumento" },
                  { id: "roteiro", icon: "🎬", label: "Roteiro" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as FichaTipo)}
                    className={`p-3.5 border flex flex-col items-center justify-center gap-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      activeTab === tab.id 
                        ? "border-[#c4a35a] bg-gradient-to-b from-[#c4a35a]/10 to-[#c4a35a]/5 text-[#c4a35a] shadow-[inset_0_0_15px_rgba(196,163,90,0.06),0_4px_15px_rgba(0,0,0,0.3)] font-bold scale-[1.02]" 
                        : "border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20"
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-mono text-[9.5px] uppercase font-bold tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Active form section render */}
              <div className="bg-zinc-950/80 border border-zinc-900/80 p-6 md:p-8 space-y-6 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                
                {activeTab === "artista" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Nome do Artista</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Miles Davis"
                          value={artistaNome}
                          onChange={(e) => setArtistaNome(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Era / Período cronológico</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Jazz modal · 1926-1991"
                          value={artistaEra}
                          onChange={(e) => setArtistaEra(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Nacionalidade / Nascimento</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Americano · Illinois"
                          value={artistaNac}
                          onChange={(e) => setArtistaNac(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Instrumentos principais</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Trompete, Piano"
                          value={artistaInstr}
                          onChange={(e) => setArtistaInstr(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Gêneros musicais</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Bebop, Cool Jazz, Fusion"
                          value={artistaGeneros}
                          onChange={(e) => setArtistaGeneros(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Ângulo editorial / Contexto extra (Opcional)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Ênfase no álbum 'Kind of Blue' e na transição harmônica para o jazz modal..."
                        value={artistaExtra}
                        onChange={(e) => setArtistaExtra(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3.5 text-zinc-100 placeholder-zinc-750 resize-none font-sans rounded-lg transition duration-200"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "movimento" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Nome do Movimento Estético</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Bossa Nova"
                          value={movNome}
                          onChange={(e) => setMovNome(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Período Ativo Estimado</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 1958 - 1964"
                          value={movPeriodo}
                          onChange={(e) => setMovPeriodo(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">País ou Região de Origem</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Rio de Janeiro, Brasil"
                          value={movOrigem}
                          onChange={(e) => setMovOrigem(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Lideranças / Figuras Chaves</label>
                        <input 
                          type="text" 
                          placeholder="Ex: João Gilberto, Tom Jobim, Vinícius de Moraes"
                          value={movFiguras}
                          onChange={(e) => setMovFiguras(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Fatos Adicionais de Ênfase (Opcional)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Ênfase na batida sincopada do violão de João Gilberto derivada do samba clã..."
                        value={movExtra}
                        onChange={(e) => setMovExtra(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3.5 text-zinc-100 placeholder-zinc-750 resize-none font-sans rounded-lg transition duration-200"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "musica" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Título da Música / Álbum</label>
                        <input 
                          type="text" 
                          placeholder="Ex: A Love Supreme"
                          value={musTitulo}
                          onChange={(e) => setMusTitulo(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Artista Responsável</label>
                        <input 
                          type="text" 
                          placeholder="Ex: John Coltrane"
                          value={musArtista}
                          onChange={(e) => setMusArtista(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Ano de Lançamento</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 1965"
                          value={musAno}
                          onChange={(e) => setMusAno(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Gêneros e Subgêneros</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Jazz espiritual, Modal jazz, Free jazz"
                          value={musGenero}
                          onChange={(e) => setMusGenero(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Por que é uma Música Pivô? (Opcional)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Explique a mística religiosa ou estrutural do álbum dividido em quatro partes..."
                        value={musExtra}
                        onChange={(e) => setMusExtra(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3.5 text-zinc-100 placeholder-zinc-750 resize-none font-sans rounded-lg transition duration-200"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "roteiro" && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Tema Principal / Título Provisório de Vídeo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Como o Blues africano chegou ao Mississippi"
                        value={rotTema}
                        onChange={(e) => setRotTema(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Época / Gênero enfocado</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Mississipi Delta Blues · Século XX"
                          value={rotEra}
                          onChange={(e) => setRotEra(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Formato Estimado</label>
                        <select 
                          value={rotFormato}
                          onChange={(e) => setRotFormato(e.target.value)}
                          className="bg-zinc-900 border border-[#c4a35a]/10 hover:border-zinc-700/85 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-700 rounded-lg transition duration-200 font-sans cursor-pointer"
                        >
                          <option value="Vídeo longo · YouTube" className="bg-zinc-950 text-zinc-300">Vídeo longo · YouTube</option>
                          <option value="Shorts / Reels · 60s" className="bg-zinc-950 text-zinc-300">Shorts / Reels · 60s</option>
                          <option value="Vídeo médio · YouTube (5-10 min)" className="bg-zinc-950 text-zinc-300">Vídeo médio · YouTube (5-10 min)</option>
                          <option value="Episódio Podcast / Ensaio de Áudio" className="bg-zinc-950 text-zinc-300">Episódio Podcast / Ensaio de Áudio</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Ângulo / Tese dramática desejada (Opcional)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Ênfase na conexão das claves de tambor da África Ocidental que foram mantidas nos cantos de trabalho mesmo sem instrumentos..."
                        value={rotExtra}
                        onChange={(e) => setRotExtra(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3.5 text-zinc-100 placeholder-zinc-750 resize-none font-sans rounded-lg transition duration-200"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "instrumento" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Nome do Instrumento</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Clarinete, Sintetizador Moog, Cravo"
                          value={instNome}
                          onChange={(e) => setInstNome(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-750 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Família Acústica</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Madeiras / Sopros, Sintetizadores Analógicos, Teclados"
                          value={instFamilia}
                          onChange={(e) => setInstFamilia(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-750 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Origem Histórica (Área / Época)</label>
                        <input 
                          type="text" 
                          placeholder="Ex: França, século XVII (evolução do Chalumeau)"
                          value={instOrigem}
                          onChange={(e) => setInstOrigem(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-750 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Construtores / Inventores Principais</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Johann Christoph Denner"
                          value={instConstrutores}
                          onChange={(e) => setInstConstrutores(e.target.value)}
                          className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-750 rounded-lg transition duration-200 font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a]/70 font-bold block mb-1">Contexto adicional, Ênfases ou Virtuoses específicos (Opcional)</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Dar ênfase na transição rítmica e de textura timbrística do Choro brasileiro e no papel seminal de Pixinguinha..."
                        value={instExtra}
                        onChange={(e) => setInstExtra(e.target.value)}
                        className="bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3.5 text-zinc-100 placeholder-zinc-750 resize-none font-sans rounded-lg transition duration-200"
                      />
                    </div>
                  </div>
                )}

                {/* Campo de URL do YouTube para extração de pontos de estudo */}
                <div className="border-t border-zinc-900/60 pt-5 mt-5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-3.5 h-3.5 text-[#c4a35a]" />
                    <label className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold">
                      Link de Vídeo do YouTube (Opcional)
                    </label>
                    <span className="bg-zinc-900 border border-[#c4a35a]/20 px-1.5 py-0.5 rounded text-[7px] font-mono uppercase text-[#c4a35a] font-extrabold">Extrair com IA</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-850 hover:border-zinc-700/80 text-sm focus:border-[#c4a35a] focus:bg-zinc-900 focus:ring-1 focus:ring-[#c4a35a]/40 outline-none p-3 text-zinc-100 placeholder-zinc-750 rounded-lg transition duration-200 font-sans"
                  />
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Insira o link de um vídeo do YouTube sobre o tema do estudo. A inteligência artificial extrairá os principais pontos, insights e fatos históricos do conteúdo para preencher e fundamentar a ficha gerada.
                  </p>
                </div>

                {/* Generate triggering button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="w-full flex items-center justify-center gap-3 bg-[#c4a35a] hover:bg-[#ebdcb9] active:scale-[0.99] text-zinc-100 hover:text-zinc-950 font-mono text-xs uppercase tracking-[0.25em] py-4.5 transition-all duration-300 shadow-[0_4px_25px_rgba(196,163,90,0.18)] font-black select-none cursor-pointer rounded-lg hover:shadow-[0_4px_40px_rgba(196,163,90,0.35)] mt-4"
                >
                  <Sparkles className="w-4 h-4 text-zinc-950 animate-pulse" />
                  Gerar Ficha com Inteligência Artificial
                </button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </main>

        {/* Right Sidebar: Obsidian Vault Panel */}
        <aside className={`border-t lg:border-t-0 lg:border-l border-zinc-900/90 bg-zinc-950/95 flex flex-col transition-all duration-300 origin-right flex-shrink-0 overflow-hidden ${
          !isObsidianCollapsed
            ? "w-full lg:w-[380px] h-[480px] lg:h-full opacity-100" 
            : "w-0 h-0 lg:h-full lg:w-0 overflow-hidden border-t-0 border-l-0 lg:border-l-0 opacity-0 pointer-events-none select-none"
        }`}>
          <div className="w-full lg:w-[380px] lg:min-w-[380px] lg:max-w-[380px] flex-1 flex flex-col min-h-0 bg-transparent animate-fade-in flex-shrink-0">
            <div className="p-4 border-b border-zinc-900/65 flex items-center justify-between flex-shrink-0 bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="font-sans text-xs uppercase tracking-wider text-purple-300 font-extrabold">
                  Cofre Obsidian
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsObsidianCollapsed(true)}
                title="Esconder painel Obsidian"
                className="text-zinc-500 hover:text-purple-400 p-1.5 rounded hover:bg-zinc-900/50 transition cursor-pointer flex items-center justify-center"
              >
                <PanelRightClose className="w-4 h-4 text-purple-400/85" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto sidebar-scrollable min-h-0 p-4.5 space-y-4.5 text-left flex flex-col">
              
              {/* Visual Segments / Tab Selector */}
              <div className="flex bg-zinc-950/95 p-1 rounded-lg border border-zinc-900/90 gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setVaultMode("server");
                    localStorage.setItem("obsidian_vault_mode", "server");
                  }}
                  title="Servidor Nuvem (Virtual)"
                  className={`flex-1 py-2 rounded-md cursor-pointer transition flex items-center justify-center ${
                    vaultMode === "server" 
                      ? "bg-purple-950/30 text-purple-300 border border-purple-900/40" 
                      : "text-zinc-550 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  <Cloud className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVaultMode("local");
                    localStorage.setItem("obsidian_vault_mode", "local");
                  }}
                  title="Pasta Local (Meu Computador)"
                  className={`flex-1 py-2 rounded-md cursor-pointer transition flex items-center justify-center ${
                    vaultMode === "local" 
                      ? "bg-purple-950/30 text-purple-300 border border-purple-900/40" 
                      : "text-zinc-550 hover:text-zinc-300 border border-transparent"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                </button>
              </div>

              {/* PANEL 1: CONECTIVIDADE E MAPEAMENTO - COLLAPSIBLE ACCORDION */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPanelObsidianConnOpen(!panelObsidianConnOpen)}
                  className="w-full p-3.5 bg-zinc-950/60 hover:bg-zinc-950/80 flex items-center justify-between transition text-left border-b border-zinc-900/50"
                >
                  <span className="font-sans text-[11px] uppercase tracking-wider text-purple-300 font-extrabold flex items-center gap-2">
                    <span>📡 Conectividade e Pasta</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold font-mono">{panelObsidianConnOpen ? "▲" : "▼"}</span>
                </button>

                {panelObsidianConnOpen && (
                  <div className="p-4 space-y-4 animate-fade-in text-left">
                    {vaultMode === "server" ? (
                      <div className="space-y-4">
                        <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                          Sincronize as fichas com o servidor virtual integrado. Ao salvar, as notas são gravadas em subpastas correspondentes. Você pode fazer o download completo do projeto a qualquer momento.
                        </p>

                        <div className="space-y-3 bg-zinc-950/70 p-3.5 rounded-lg border border-zinc-900 flex-shrink-0">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="font-sans text-[10.5px] uppercase tracking-wider text-purple-300 font-bold">
                                Caminho do Cofre
                              </label>
                              <button
                                type="button"
                                onClick={handleOpenFolderBrowser}
                                className="text-[9.5px] font-sans font-bold uppercase tracking-wide text-purple-400 hover:text-purple-300 transition flex items-center gap-1 cursor-pointer bg-purple-950/30 hover:bg-purple-950/60 px-2 py-0.5 border border-purple-900/40 hover:border-purple-500/60 rounded"
                                title="Buscar rotas ou criar pastas no servidor"
                              >
                                <Search className="w-2.5 h-2.5" />
                                <span>Buscar</span>
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                value={localVaultPath}
                                onChange={(e) => setLocalVaultPath(e.target.value)}
                                onBlur={() => handleUpdateVaultPath(localVaultPath)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateVaultPath(localVaultPath);
                                  }
                                }}
                                placeholder="Ex: obsidian ou caminhos/do/vault"
                                className="flex-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 text-xs px-2.5 py-2 text-zinc-100 outline-none rounded focus:border-purple-300/85 font-mono leading-tight"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateVaultPath(localVaultPath)}
                                className="px-3 bg-purple-950/45 hover:bg-purple-900 border border-purple-900 hover:border-purple-500 text-purple-300 font-sans text-xs uppercase tracking-wider font-extrabold transition rounded cursor-pointer flex items-center justify-center leading-none"
                                title="Confirmar caminho"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Subfolders mapping layout */}
                        <div className="pt-1">
                          <span className="font-sans text-[10.5px] uppercase tracking-wider text-zinc-400 font-bold block mb-2">
                            Estrutura de Pastas Destino:
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                            {[
                              { name: "Artista", status: obsidianStatus?.folderStatus?.["Artista"] },
                              { name: "Movimento", status: obsidianStatus?.folderStatus?.["Movimento"] },
                              { name: "Música", status: obsidianStatus?.folderStatus?.["Música"] },
                              { name: "Roteiro", status: obsidianStatus?.folderStatus?.["Roteiro"] },
                            ].map((f) => (
                              <div key={f.name} className="flex items-center gap-2 bg-zinc-950/65 p-2 rounded-lg border border-zinc-900 leading-tight">
                                <span className="text-[#c4a35a] text-sm">📁</span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11.5px] text-zinc-100 font-bold truncate mb-0.5">{f.name}/</div>
                                  <div className={`text-[9px] uppercase font-bold tracking-wide leading-none ${f.status ? "text-emerald-400" : "text-amber-500/80"}`}>
                                    {f.status ? "Mapeada" : "Automat"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Directory Connection State */}
                        {obsidianStatus && (
                          <div className="text-xs font-sans space-y-1 bg-zinc-900/30 p-2.5 text-zinc-300 rounded-lg border border-zinc-900 flex-shrink-0">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-extrabold">
                              <span>Status de Conexão:</span>
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${obsidianStatus.vaultExists ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/25" : "bg-zinc-800 text-zinc-400"}`}>
                                {obsidianStatus.vaultExists ? "Ativo" : "Pendente"}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1.5 font-mono whitespace-normal break-all">
                              Servidor: <code className="text-purple-300">/{obsidianStatus.vaultPathResolved}</code>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateVaultPath(localVaultPath)}
                            disabled={isCheckingObsidian}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-purple-900 hover:border-purple-500 py-2.5 text-[11px] font-sans uppercase tracking-wider text-purple-300 hover:text-white bg-purple-950/20 hover:bg-purple-950/40 rounded-lg transition duration-200 font-extrabold cursor-pointer select-none"
                            title="Atualizar conexões do servidor"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingObsidian ? "animate-spin text-purple-300" : "text-purple-400"}`} />
                            <span>Sincronizar</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadVault}
                            className="flex-1 flex items-center justify-center gap-1.5 border border-[#c4a35a]/50 hover:border-[#c4a35a] py-2.5 text-[11px] font-sans uppercase tracking-wider text-[#ebdcb9] hover:text-white bg-[#c4a35a]/10 hover:bg-[#c4a35a]/20 rounded-lg transition duration-200 font-extrabold cursor-pointer select-none"
                            title="Fazer download do cofre como ZIP"
                          >
                            <Download className="w-3.5 h-3.5 text-[#c4a35a]" />
                            <span>Baixar ZIP</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!localDirName ? (
                          <div className="space-y-3.5 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
                            <div className="text-center py-1 space-y-2 select-none">
                              <span className="text-2xl block animate-pulse">💿</span>
                              <h4 className="font-sans text-xs uppercase tracking-wider text-purple-300 font-extrabold">Conectar Pasta Local</h4>
                              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                                Abra, mapeie e analise uma pasta do seu próprio computador. Suas notas serão listadas na tela e salvas diretamente nela.
                              </p>
                            </div>

                            <div className="space-y-2">
                              {/* Fallback input for sandboxed frames - works everywhere */}
                              <label className={`w-full min-h-11 flex items-center justify-center gap-2 border py-2.5 px-3 rounded-lg text-[10.5px] font-sans uppercase tracking-wider font-extrabold transition cursor-pointer relative text-center select-none ${
                                isCrossOriginIframe()
                                  ? "border-purple-700/60 bg-purple-950/25 hover:bg-purple-950/45 hover:border-purple-500 text-purple-200"
                                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:text-white"
                              }`}>
                                <Search className="w-4 h-4 text-purple-400" />
                                <span>Carregar Pasta (Análise)</span>
                                <input
                                  type="file"
                                  // @ts-ignore
                                  webkitdirectory=""
                                  directory=""
                                  onChange={handleLocalFolderUpload}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </label>

                              {/* Direct writable directory api handle */}
                              <button
                                type="button"
                                onClick={handleSelectNativeDirectory}
                                className={`w-full flex items-center justify-center gap-2 border py-2.5 px-3 rounded-lg text-[10.5px] font-sans uppercase tracking-wider font-extrabold transition cursor-pointer select-none ${
                                  isCrossOriginIframe()
                                    ? "border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                                    : "border-purple-900/50 bg-purple-950/15 hover:bg-purple-950/35 hover:border-purple-500 text-purple-300 hover:text-white"
                                }`}
                                title={
                                  isCrossOriginIframe()
                                    ? "Requer abrir o app em uma nova aba para gravação física direta"
                                    : "Vincular pasta do computador com gravação totalmente automática de arquivos"
                                }
                              >
                                <FolderPlus className="w-4 h-4 text-purple-400" />
                                <span>Gravação Direta (Nativo)</span>
                              </button>
                            </div>

                            {localPickerError && (
                              <div className="text-[10px] text-[#ebdcb9]/90 font-sans bg-amber-950/25 p-3 rounded-lg border border-amber-800/40 leading-relaxed space-y-2">
                                {localPickerError === "IFRAME_BLOCKED" ? (
                                  <>
                                    <p>
                                      ⚠️ <strong>Gravação Direta bloqueada neste painel incorporado</strong> por política de segurança do navegador. Use o botão <strong>"Carregar Pasta (Análise)"</strong> acima ou abra o app em uma nova aba para gravação direta:
                                    </p>
                                    <a
                                      href={window.location.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-950 bg-[#c4a35a] hover:bg-[#d6b76c] px-2.5 py-1.5 rounded transition"
                                    >
                                      Abrir em Nova Aba ↗
                                    </a>
                                  </>
                                ) : (
                                  <span>{localPickerError}</span>
                                )}
                              </div>
                            )}
                            <p className="text-[9px] text-zinc-500 text-center uppercase tracking-wide leading-relaxed font-sans">
                              Recomendado selecionar a pasta principal "obsidian" ou suas subpastas!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-zinc-950/75 p-3 rounded-lg border border-zinc-900 flex items-center justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-sans text-[9px] uppercase tracking-wide text-zinc-450 font-bold block">Pasta Mapeada:</span>
                                <span className="font-mono text-xs text-purple-300 font-bold truncate block mt-0.5">💻 {localDirName}</span>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                {localDirHandle && (
                                  <button
                                    type="button"
                                    onClick={() => scanNativeDirectory(localDirHandle)}
                                    title="Sincronizar e recarregar arquivos da pasta"
                                    className="p-1 px-1.5 bg-zinc-900 hover:bg-zinc-850 text-purple-400 rounded border border-zinc-805 hover:border-zinc-700 cursor-pointer text-xs"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocal ? "animate-spin" : ""}`} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLocalDirName("");
                                    setIndexedLocalFiles([]);
                                    setLocalDirHandle(null);
                                    localStorage.removeItem("local_dir_name");
                                  }}
                                  className="px-2 py-1 bg-red-950/15 hover:bg-red-950/40 text-red-100 hover:text-red-300 border border-red-900/25 hover:border-red-650 rounded-md text-[10px] font-sans uppercase tracking-wider font-bold select-none cursor-pointer"
                                >
                                  Sair
                                </button>
                              </div>
                            </div>

                            {localDirHandle ? (
                              <div className="bg-emerald-950/10 border border-emerald-950/30 rounded-lg p-2.5 flex items-start gap-1.5">
                                <span className="text-emerald-400 text-xs">⚡</span>
                                <p className="text-[9.5px] text-zinc-400 font-sans leading-relaxed">
                                  <strong className="text-emerald-400">Escrita Ativa</strong>: Todas as alterações que você salvar serão gravadas imediatamente de forma direta física no seu computador.
                                </p>
                              </div>
                            ) : (
                              <div className="bg-amber-950/25 border border-amber-800/40 rounded-lg p-2.5 flex items-start gap-1.5">
                                <span className="text-amber-400 text-xs">⚠️</span>
                                <p className="text-[9.5px] text-zinc-400 font-sans leading-relaxed">
                                  <strong className="text-amber-400">Leitura</strong>: Pasta aberta para visualização das notas. Para habilitar gravação física no drive, abra o app em uma <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-[#ebdcb9] hover:text-white font-extrabold underline transition" title="Abrir em uma Nova Aba">Nova Aba</a> e reconecte via "Gravação Direta".
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PANEL 2: EXPLORADOR DE FICHAS LOCAIS (ONLY SHOWN IF LOCAL IN MEU COMPUTADOR MODE AND CONNECTED) */}
              {vaultMode === "local" && localDirName && (
                <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/30 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPanelObsidianExploreOpen(!panelObsidianExploreOpen)}
                    className="w-full p-3.5 bg-zinc-950/60 hover:bg-zinc-950/80 flex items-center justify-between transition text-left border-b border-zinc-900/50"
                  >
                    <span className="font-sans text-[11px] uppercase tracking-wider text-purple-300 font-extrabold flex items-center gap-2">
                      <span>📂 Analisador e Explorador ({indexedLocalFiles.length})</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold font-mono">{panelObsidianExploreOpen ? "▲" : "▼"}</span>
                  </button>

                  {panelObsidianExploreOpen && (
                    <div className="p-4 space-y-4 animate-fade-in text-left">
                      {/* Stats Grid */}
                      <div className="bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900/80 space-y-2">
                        <div className="flex justify-between items-center border-b border-zinc-900/40 pb-1.5 text-zinc-400 text-[9.5px] uppercase font-sans tracking-wide font-extrabold">
                          <span>Fichas Catalogadas:</span>
                          <span className="text-[#c4a35a] bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 font-mono text-[10.5px] font-bold">{indexedLocalFiles.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 font-sans text-[10px]">
                          {[
                            { name: "Artista", count: indexedLocalFiles.filter(f => f.parentFolder === "Artista").length },
                            { name: "Movimento", count: indexedLocalFiles.filter(f => f.parentFolder === "Movimento").length },
                            { name: "Música", count: indexedLocalFiles.filter(f => f.parentFolder === "Música").length },
                            { name: "Roteiro", count: indexedLocalFiles.filter(f => f.parentFolder === "Roteiro").length }
                          ].map(sub => (
                            <div key={sub.name} className="flex justify-between bg-zinc-950/65 p-1.5 px-2 border border-zinc-900/50 rounded">
                              <span className="text-zinc-500">{sub.name}/:</span>
                              <span className="text-[#ebdcb9] font-bold">{sub.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* File Search and Tab Pill Filters */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={localSearchQuery}
                            onChange={(e) => setLocalSearchQuery(e.target.value)}
                            placeholder="Buscar arquivos locais..."
                            className="w-full bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-xs pl-8 pr-2.5 py-1.5 text-zinc-100 outline-none rounded-lg focus:border-purple-300 font-sans"
                          />
                        </div>

                        <div className="flex gap-1 overflow-x-auto scrollbar-none py-0.5 whitespace-nowrap scroll-smooth">
                          {["Tudo", "Artista", "Movimento", "Música", "Roteiro"].map(tab => {
                            const isActive = selectedSubfolderTab === tab;
                            return (
                              <button
                                key={tab}
                                type="button"
                                onClick={() => setSelectedSubfolderTab(tab)}
                                className={`flex-shrink-0 px-2.5 py-1 rounded border text-[9.5px] font-sans uppercase tracking-wider font-extrabold cursor-pointer transition ${
                                  isActive 
                                    ? "bg-[#c4a35a]/15 text-[#ebdcb9] border-[#c4a35a]/55" 
                                    : "bg-zinc-900/30 text-zinc-400 border-transparent hover:text-zinc-300 hover:border-zinc-800"
                                }`}
                              >
                                {tab}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive File browser list with unified scrolling and spacious width */}
                      <div className="max-h-[220px] overflow-y-auto sidebar-scrollable border border-zinc-900 rounded-lg bg-zinc-950/40 p-1 space-y-1">
                        {(() => {
                           const filtered = indexedLocalFiles.filter(f => {
                             const matchesSearch = f.name.toLowerCase().includes(localSearchQuery.toLowerCase()) || 
                                                   f.relativePath.toLowerCase().includes(localSearchQuery.toLowerCase());
                             const matchesTab = selectedSubfolderTab === "Tudo" || f.parentFolder === selectedSubfolderTab;
                             return matchesSearch && matchesTab;
                           });

                           if (filtered.length === 0) {
                             return (
                               <div className="text-center py-6 text-zinc-650 font-sans text-[11px]">
                                 Nenhum arquivo encontrado em {selectedSubfolderTab}.
                               </div>
                             );
                           }

                           return filtered.map(file => {
                             const isSelected = selectedLocalFile === file.relativePath;
                             const isMd = file.name.endsWith(".md");
                             return (
                               <button
                                 key={file.relativePath}
                                 type="button"
                                 onClick={() => handleViewLocalFile(file)}
                                 className={`w-full flex items-center justify-between p-2 rounded-md border text-left transition min-w-0 ${
                                   isSelected 
                                     ? "bg-purple-950/20 border-purple-800 text-white" 
                                     : "bg-zinc-900/10 border-zinc-900/60 text-zinc-300 hover:bg-zinc-900/30 hover:border-zinc-800"
                                 }`}
                               >
                                 <div className="flex items-center gap-2 min-w-0 flex-1">
                                   <span className="text-xs flex-shrink-0">{isMd ? "📝" : "🌐"}</span>
                                   <div className="min-w-0 flex-1 pr-1">
                                     <p className="text-[11px] font-bold truncate leading-snug text-zinc-200">{file.name}</p>
                                     <p className="text-[9px] font-sans text-zinc-500 truncate mt-0.5">/{file.relativePath}</p>
                                   </div>
                                 </div>
                                 <span className="text-[9px] font-mono text-zinc-550 ml-1 flex-shrink-0 bg-zinc-950/50 px-1 py-0.5 rounded border border-zinc-900/40">
                                   {(file.size / 1024).toFixed(1)} KB
                                 </span>
                               </button>
                             );
                           });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PANEL 3: GERENCIAMENTO DE MODELOS (TEMPLATES) - ACCORDION DRAWER */}
              <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPanelObsidianTemplatesOpen(!panelObsidianTemplatesOpen)}
                  className="w-full p-3.5 bg-zinc-950/60 hover:bg-zinc-950/80 flex items-center justify-between transition text-left border-b border-zinc-900/50"
                >
                  <span className="font-sans text-[11px] uppercase tracking-wider text-purple-300 font-extrabold flex items-center gap-2">
                    <span>🔮 Modelos de Fichas (Templates)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold font-mono">{panelObsidianTemplatesOpen ? "▲" : "▼"}</span>
                </button>

                {panelObsidianTemplatesOpen && (
                  <div className="p-4 space-y-4 animate-fade-in text-left">
                    <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                      O app analisa a pasta <code className="text-purple-300 font-mono text-[10.5px]">templates/</code> do seu cofre buscando preencher tópicos personalizados, wiki-links de eras e tags para consolidar o Mapa de Eras no Obsidian.
                    </p>

                    {/* Templates list with spacious sizing */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                      {[
                        { key: "artista", label: "Artista" },
                        { key: "movimento", label: "Movimento" },
                        { key: "musica", label: "Música" },
                        { key: "roteiro", label: "Roteiro" },
                        { key: "instrumento", label: "Instrumento" }
                      ].map(t => {
                        const isCustom = !!vaultTemplates[t.key];
                        return (
                          <div 
                            key={t.key} 
                            className={`p-2 rounded-lg border flex items-center justify-between gap-1 leading-normal ${
                              isCustom 
                                ? "bg-purple-950/20 border-purple-900/50 text-purple-200 font-bold" 
                                : "bg-zinc-900/40 border-zinc-900/60 text-zinc-500"
                            }`}
                            title={isCustom ? `Template customizado de ${t.label} encontrado na pasta 'templates/'` : `Usando o preenchedor padrão para ${t.label}`}
                          >
                            <span className="truncate">{t.label}</span>
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${isCustom ? "bg-emerald-950/70 border border-emerald-800 text-emerald-400" : "bg-zinc-950 border border-zinc-900 text-zinc-550"}`}>
                              {isCustom ? "PC" : "SaaS"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={vaultMode === "local" ? handleCreateDefaultTemplatesLocal : handleCreateDefaultTemplatesServer}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-950/40 to-[#c4a35a]/10 hover:from-purple-900/30 hover:to-[#c4a35a]/20 border border-purple-900/35 hover:border-purple-650 text-[#ebdcb9] hover:text-white transition duration-200 rounded-lg font-sans text-[10.5px] uppercase tracking-wider font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shadow select-none"
                    >
                      <span>🎬 Municiar Vault com Modelos</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </aside>
      </div>

      {/* Interactive Directory Browser Modal */}
      <AnimatePresence>
        {isBrowsingFolders && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] text-left overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-purple-400" />
                  <span className="font-sans text-xs uppercase tracking-wider text-zinc-100 font-extrabold">
                    Pesquisar Caminho do Cofre
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBrowsingFolders(false)}
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900/65 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Path navigation bar */}
              <div className="bg-zinc-900/40 p-4 border-b border-zinc-900 flex items-center gap-2.5 text-xs font-sans text-zinc-300">
                <button
                  type="button"
                  disabled={!browseParent && browseCurrentPath === "."}
                  onClick={() => {
                    if (browseParent !== null) {
                      loadDirectoryList(browseParent);
                    } else if (browseCurrentPath !== ".") {
                      const segments = browseCurrentPath.split("/");
                      segments.pop();
                      const parentStr = segments.join("/") || ".";
                      loadDirectoryList(parentStr);
                    }
                  }}
                  className="p-1 px-2.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 disabled:hover:bg-zinc-900/40 hover:text-white transition flex items-center gap-1 cursor-pointer font-bold disabled:cursor-not-allowed text-[10px] uppercase font-sans tracking-wide border border-zinc-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
                <div className="flex-grow overflow-x-auto whitespace-nowrap scrollbar-none py-1.5 px-3 bg-zinc-950 border border-zinc-900 rounded text-purple-300 text-[10.5px] font-bold font-mono">
                  {browseCurrentPath === "." ? "Raiz do Projeto" : `./${browseCurrentPath}`}
                </div>
              </div>

              {/* Directory List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[290px] minimal-scrollbar bg-zinc-950/20">
                {isBrowsingLoading ? (
                  <div className="flex flex-col items-center justify-center py-14 space-y-3 text-zinc-500">
                    <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                    <span className="text-[10px] font-sans uppercase tracking-wider font-extrabold">Carregando Pastas...</span>
                  </div>
                ) : (
                  <>
                    {browseCurrentPath === "." && !browseDirs.includes("obsidian") && (
                      <button
                        type="button"
                        onClick={() => {
                          const createDefaultObsidian = async () => {
                            try {
                              const res = await fetch("/api/obsidian/create-dir", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ parentPath: ".", dirName: "obsidian" }),
                              });
                              await parseResponseJson(res);
                              loadDirectoryList("obsidian");
                            } catch (e) {
                              console.error(e);
                            }
                          };
                          createDefaultObsidian();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-purple-900/30 bg-purple-950/15 hover:bg-purple-950/25 text-purple-300 hover:text-purple-200 transition text-left cursor-pointer font-sans"
                      >
                        <span className="text-purple-400 text-base">✨</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold font-sans text-xs text-purple-300">Criar pasta padrão "obsidian/"</p>
                          <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-normal">Selecione este atalho para criar e navegar até a pasta recomendada para guardar o seu cofre do Obsidian.</p>
                        </div>
                      </button>
                    )}

                    {browseDirs.length === 0 ? (
                      <div className="text-center py-12 text-zinc-550 font-sans space-y-1">
                        <p className="text-[11px] font-sans uppercase tracking-wide text-zinc-500 font-extrabold">Sem Subpastas</p>
                        <p className="text-[10.5px] text-zinc-500">Nenhum diretório encontrado aqui. Crie uma nova pasta abaixo!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 ">
                        {browseDirs.map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() => {
                              const nextPath = browseCurrentPath === "." ? dir : `${browseCurrentPath}/${dir}`;
                              loadDirectoryList(nextPath);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-900 hover:border-purple-900/40 bg-zinc-900/15 hover:bg-purple-950/10 text-zinc-300 hover:text-white transition text-left cursor-pointer font-sans"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Folder className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              <span className="text-[11.5px] font-semibold truncate text-zinc-200">{dir}</span>
                            </div>
                            <span className="text-[10px] font-sans tracking-wide font-extrabold text-purple-400 hover:text-purple-300 transition">
                              [ Abrir ]
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Create Folder Area */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-2">
                <span className="font-sans text-[10px] uppercase tracking-wide text-zinc-400 font-bold block leading-none">
                  Nova Pasta neste nível:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: meu-cofre"
                    value={newDirName}
                    onChange={(e) => {
                      setNewDirName(e.target.value);
                      setCreateDirError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateDirectory();
                    }}
                    className="flex-1 bg-zinc-900 border border-zinc-850 hover:border-zinc-700/80 text-xs px-2.5 py-1.5 text-zinc-100 outline-none rounded focus:border-purple-500/85 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleCreateDirectory}
                    className="px-3 bg-purple-950/45 hover:bg-purple-900 hover:text-white text-purple-300 border border-purple-900 hover:border-purple-500 transition rounded-lg flex items-center justify-center cursor-pointer"
                    title="Criar Pasta"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {createDirError && (
                  <p className="text-[9.5px] text-red-400 font-mono italic leading-none">{createDirError}</p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrowsingFolders(false)}
                  className="flex-1 border border-zinc-900 hover:border-zinc-800 py-2.5 text-[9.5px] font-mono uppercase tracking-[0.12em] text-zinc-400 hover:text-zinc-200 bg-zinc-900/20 hover:bg-zinc-900/40 rounded-lg transition duration-200 cursor-pointer font-extrabold text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBrowsedFolder(browseCurrentPath)}
                  className="flex-1 border border-purple-900 bg-purple-950/20 hover:bg-purple-950/55 hover:border-purple-500 text-purple-200 py-2.5 text-[9.5px] font-mono uppercase tracking-[0.12em] rounded-lg transition duration-200 cursor-pointer font-extrabold flex items-center justify-center gap-1.5 text-center shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                >
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                  Confirmar Caminho
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Local File Viewer Overlay */}
      <AnimatePresence>
        {selectedLocalFile && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[75vh] text-left overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-zinc-100 font-bold truncate">
                      Visualizador de Ficha Local
                    </p>
                    <p className="text-[10px] font-mono text-[#c4a35a] truncate">
                      {selectedLocalFile}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLocalFile(null)}
                  className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-900/65 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto p-5 font-mono text-xs text-zinc-200 whitespace-pre-wrap bg-zinc-900/20 sidebar-scrollable leading-relaxed selection:bg-purple-900/60 selection:text-white">
                {localFileContentView}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between text-[10.5px]">
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
                  Leitor de arquivos integrado · Cofre Obsidian
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLocalFile(null)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-[10px] uppercase tracking-wider rounded-lg border border-zinc-800 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Full Screen Timeline and Eras Map Modal */}
      <TimelineFullView
        isOpen={isTimelineFullViewOpen}
        onClose={() => setIsTimelineFullViewOpen(false)}
        fichas={fichas}
        activeFicha={activeFicha}
        onSelectFicha={(f) => {
          setActiveFicha(f);
        }}
      />

      <footer className="border-t border-zinc-900 bg-zinc-950/70 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] select-none text-zinc-500 font-mono">
        <span className="uppercase tracking-[0.18em]">Apoiado por Google Gemini 2.5 Pro & Antigravity Agent</span>
        <span className="uppercase tracking-widest text-[#c4a35a]/60">© {new Date().getFullYear()} Andamento História e Música · Premium SaaS</span>
      </footer>
    </div>
  );
}
