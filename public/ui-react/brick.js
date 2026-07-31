(function(react, react_router_dom, react_jsx_runtime) {
	//#region src/site-robot-api.ts
	var XHR_HEADER = { "X-Requested-With": "XMLHttpRequest" };
	async function apiFetch(url, opts = {}) {
		const res = await fetch(url, {
			credentials: "include",
			...opts,
			headers: {
				...XHR_HEADER,
				...opts.headers || {}
			}
		});
		const txt = await res.text();
		let json = null;
		try {
			json = txt ? JSON.parse(txt) : null;
		} catch {}
		if (!res.ok || !json || json.success === false) throw new Error(json && json.error || `HTTP ${res.status}`);
		return json.data;
	}
	function fetchDomains(params = {}) {
		const qs = new URLSearchParams();
		if (params.search) qs.set("search", params.search);
		if (params.site) qs.set("site", String(params.site));
		if (params.limit != null) qs.set("limit", String(params.limit));
		if (params.sort) qs.set("sort", params.sort);
		if (params.dir) qs.set("dir", params.dir);
		if (params.after) qs.set("after", params.after);
		return apiFetch(`/melis/react-api/site-robots?${qs}`);
	}
	var fetchRobotStats = () => apiFetch("/melis/react-api/site-robots/stats");
	var fetchSites = () => apiFetch("/melis/react-api/site-robots/sites").then((d) => d.sites);
	var fetchDomainById = (id) => apiFetch(`/melis/react-api/site-robots/${id}`);
	var saveRobot = (payload) => apiFetch("/melis/react-api/site-robots/save", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload)
	});
	var deleteRobot = (id) => apiFetch(`/melis/react-api/site-robots/delete/${id}`, { method: "DELETE" });
	var _stale = false;
	function markRobotListStale() {
		_stale = true;
	}
	function consumeRobotListStale() {
		const s = _stale;
		_stale = false;
		return s;
	}
	//#endregion
	//#region src/use-keyset-list.ts
	function useKeysetList(opts) {
		const LIMIT = opts.limit ?? 25;
		const [items, setItems] = (0, react.useState)(opts.initial?.items ?? []);
		const [total, setTotal] = (0, react.useState)(opts.initial?.total ?? 0);
		const [loading, setLoading] = (0, react.useState)(false);
		const [hasMore, setHasMore] = (0, react.useState)(opts.initial?.hasMore ?? false);
		const [sortCol, setSortCol] = (0, react.useState)(opts.initial?.sortCol ?? opts.defaultSort ?? "id");
		const [sortDir, setSortDir] = (0, react.useState)(opts.initial?.sortDir ?? opts.defaultDir ?? "desc");
		const cursorRef = (0, react.useRef)(opts.initial?.cursor ?? null);
		const loadingRef = (0, react.useRef)(false);
		const reqIdRef = (0, react.useRef)(0);
		const sentinelRef = (0, react.useRef)(null);
		const fetcherRef = (0, react.useRef)(opts.fetcher);
		fetcherRef.current = opts.fetcher;
		const runLoad = (0, react.useCallback)(async (reset) => {
			if (!reset && loadingRef.current) return;
			const myReq = ++reqIdRef.current;
			loadingRef.current = true;
			setLoading(true);
			const after = reset ? void 0 : cursorRef.current ?? void 0;
			try {
				const res = await fetcherRef.current({
					limit: LIMIT,
					sort: sortCol,
					dir: sortDir,
					after
				});
				if (myReq !== reqIdRef.current) return;
				cursorRef.current = res.nextCursor;
				setHasMore(res.nextCursor !== null);
				setTotal(res.total);
				setItems((prev) => reset ? res.items : [...prev, ...res.items]);
			} catch {} finally {
				if (myReq === reqIdRef.current) {
					setLoading(false);
					loadingRef.current = false;
				}
			}
		}, [
			sortCol,
			sortDir,
			LIMIT
		]);
		const didInitRef = (0, react.useRef)(false);
		(0, react.useEffect)(() => {
			if (!didInitRef.current) {
				didInitRef.current = true;
				if (opts.skipInitial) return;
			}
			runLoad(true);
		}, [
			...opts.deps,
			sortCol,
			sortDir
		]);
		(0, react.useEffect)(() => {
			if (!sentinelRef.current || !hasMore) return;
			const obs = new IntersectionObserver(([entry]) => {
				if (entry.isIntersecting) runLoad(false);
			}, { rootMargin: "120px" });
			obs.observe(sentinelRef.current);
			return () => obs.disconnect();
		}, [hasMore, runLoad]);
		const toggleSort = (0, react.useCallback)((id) => {
			setSortCol((cur) => {
				if (cur === id) {
					setSortDir((d) => d === "asc" ? "desc" : "asc");
					return cur;
				}
				setSortDir(id === "id" ? "desc" : "asc");
				return id;
			});
		}, []);
		/** Force un rechargement depuis le début (refresh / reset filtres). */
		const reload = (0, react.useCallback)(() => {
			cursorRef.current = null;
			runLoad(true);
		}, [runLoad]);
		/** Retire un élément localement (après delete) sans recharger. */
		const removeLocal = (0, react.useCallback)((pred) => {
			setItems((prev) => prev.filter((it) => !pred(it)));
			setTotal((t) => Math.max(0, t - 1));
		}, []);
		/** Snapshot pour le cache module-level. */
		const snapshot = () => ({
			items,
			total,
			cursor: cursorRef.current,
			hasMore,
			sortCol,
			sortDir
		});
		return {
			items,
			setItems,
			total,
			loading,
			hasMore,
			sentinelRef,
			sortCol,
			sortDir,
			setSortCol,
			setSortDir,
			toggleSort,
			reload,
			removeLocal,
			snapshot
		};
	}
	//#endregion
	//#region src/shared/useIsNarrow.ts
	/**
	* True when the viewport is narrower than `breakpoint`. Drives every responsive decision on
	* this brick as a JS ternary (inline styles) instead of a CSS media query — see the
	* `melis-react-mobile-responsive` skill for why.
	*/
	function useIsNarrow(breakpoint = 640) {
		const [narrow, setNarrow] = (0, react.useState)(() => window.innerWidth < breakpoint);
		(0, react.useEffect)(() => {
			const onResize = () => setNarrow(window.innerWidth < breakpoint);
			window.addEventListener("resize", onResize);
			return () => window.removeEventListener("resize", onResize);
		}, [breakpoint]);
		return narrow;
	}
	//#endregion
	//#region src/ExportModal.tsx
	function getXLSX() {
		return window.MelisXLSX ?? null;
	}
	function currentLang$1() {
		return (document.documentElement.lang || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
	}
	var DICT$1 = {
		fr: {
			export: "Exporter",
			title: "Exporter les données",
			subtitle: "{n} lignes avec les filtres actifs",
			included: "Incluses",
			excluded: "Exclues",
			drag_here: "Glisser ici",
			download: "Télécharger {fmt}",
			exporting: "Export…",
			error: "Erreur lors de l’export",
			cancel: "Annuler"
		},
		en: {
			export: "Export",
			title: "Export data",
			subtitle: "{n} rows with the active filters",
			included: "Included",
			excluded: "Excluded",
			drag_here: "Drag here",
			download: "Download {fmt}",
			exporting: "Exporting…",
			error: "Error during export",
			cancel: "Cancel"
		}
	};
	function tr(key, vars) {
		let s = DICT$1[currentLang$1()][key] ?? key;
		if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
		return s;
	}
	var card$1 = {
		border: "1px solid var(--color-border)",
		background: "var(--color-card)",
		borderRadius: 12,
		boxShadow: "0 1px 2px rgba(0,0,0,.04)"
	};
	var panelTitle$1 = {
		padding: "0 6px 4px",
		fontSize: 10,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: ".06em",
		color: "var(--color-muted-foreground)"
	};
	var btnGhost$1 = {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		height: 34,
		padding: "0 12px",
		borderRadius: 8,
		border: "1px solid var(--color-border)",
		background: "var(--color-card)",
		color: "var(--color-foreground)",
		fontSize: 14,
		cursor: "pointer"
	};
	var btnPrimary$1 = {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		height: 34,
		padding: "0 14px",
		borderRadius: 8,
		border: 0,
		background: "var(--color-primary)",
		color: "var(--color-primary-foreground,#fff)",
		fontSize: 14,
		fontWeight: 500,
		cursor: "pointer"
	};
	var GripIcon$1 = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: {
			width: 13,
			height: 13,
			flexShrink: 0,
			color: "var(--color-muted-foreground)"
		},
		viewBox: "0 0 24 24",
		fill: "currentColor",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "6",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "6",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "12",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "12",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "18",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "18",
				r: "1.5"
			})
		]
	});
	var DownloadIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		style: {
			width: 15,
			height: 15,
			flexShrink: 0
		},
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" })
	});
	var ExcelIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: {
			width: 16,
			height: 16,
			flexShrink: 0
		},
		viewBox: "0 0 24 24",
		fill: "none",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
				x: "1",
				y: "1",
				width: "22",
				height: "22",
				rx: "3",
				fill: "#217346"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "7.5",
				y1: "7.5",
				x2: "16.5",
				y2: "16.5",
				stroke: "white",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
				x1: "16.5",
				y1: "7.5",
				x2: "7.5",
				y2: "16.5",
				stroke: "white",
				strokeWidth: "2.5",
				strokeLinecap: "round"
			})
		]
	});
	var CsvIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: {
			width: 16,
			height: 16,
			flexShrink: 0
		},
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 2v6h6M16 13H8M16 17H8M10 9H8" })]
	});
	function ExportModal({ cols, labelFor, fetchAll, getCell, filename, sheetName, total, onClose }) {
		const narrow = useIsNarrow();
		const xlsx = getXLSX();
		const panelCss = {
			display: "flex",
			flexDirection: "column",
			gap: 2,
			minHeight: narrow ? 80 : 100,
			maxHeight: narrow ? "min(28vh, 200px)" : "min(48vh, 320px)",
			overflowY: "auto",
			minWidth: 0,
			borderRadius: 8,
			border: "1px dashed var(--color-border)",
			padding: 6
		};
		const [included, setIncluded] = (0, react.useState)(() => cols.filter((c) => c.visible));
		const [excluded, setExcluded] = (0, react.useState)(() => cols.filter((c) => !c.visible));
		const [format, setFormat] = (0, react.useState)(xlsx ? "xlsx" : "csv");
		const [exporting, setExporting] = (0, react.useState)(false);
		const [dragId, setDragId] = (0, react.useState)(null);
		const [over, setOver] = (0, react.useState)(null);
		function drop(panel) {
			if (!dragId) return;
			const src = [...included, ...excluded].find((c) => c.id === dragId);
			let inc = included.filter((c) => c.id !== dragId);
			let exc = excluded.filter((c) => c.id !== dragId);
			if (panel === "included") {
				const dst = over?.id;
				if (!dst || dst === "__panel__") inc = [...inc, src];
				else {
					const i = inc.findIndex((c) => c.id === dst);
					inc = i === -1 ? [...inc, src] : [
						...inc.slice(0, i),
						src,
						...inc.slice(i)
					];
				}
			} else exc = [...exc, src];
			setIncluded(inc);
			setExcluded(exc);
			setDragId(null);
			setOver(null);
		}
		function item(col, panel) {
			const isOver = over?.id === col.id && over?.panel === panel;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				draggable: true,
				onDragStart: () => setDragId(col.id),
				onDragEnd: () => {
					setDragId(null);
					setOver(null);
				},
				onDragOver: (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (over?.id !== col.id || over?.panel !== panel) setOver({
						id: col.id,
						panel
					});
				},
				onDrop: (e) => {
					e.preventDefault();
					drop(panel);
				},
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					borderRadius: 8,
					padding: "6px 8px",
					fontSize: 14,
					cursor: "grab",
					userSelect: "none",
					opacity: dragId === col.id ? .4 : 1,
					background: isOver ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
					boxShadow: isOver ? "0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent)" : "none"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GripIcon$1, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						flex: 1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					},
					children: labelFor(col.id)
				})]
			}, col.id);
		}
		const ph = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				flex: 1,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: 11,
				color: "var(--color-muted-foreground)",
				opacity: .5,
				padding: "12px 0"
			},
			children: tr("drag_here")
		});
		async function doExport() {
			if (included.length === 0) return;
			setExporting(true);
			try {
				const all = await fetchAll();
				const header = included.map((c) => labelFor(c.id));
				const rows = all.map((it) => included.map((c) => getCell(it, c.id)));
				const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
				if (format === "xlsx" && xlsx) {
					const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
					const wb = xlsx.utils.book_new();
					xlsx.utils.book_append_sheet(wb, ws, sheetName);
					xlsx.writeFile(wb, `${filename}-${dateStr}.xlsx`);
				} else {
					const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");
					const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
					const url = URL.createObjectURL(blob);
					const a = Object.assign(document.createElement("a"), {
						href: url,
						download: `${filename}-${dateStr}.csv`
					});
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				}
				onClose();
			} catch (e) {
				alert(e instanceof Error ? e.message : tr("error"));
			} finally {
				setExporting(false);
			}
		}
		const tab = (active) => ({
			flex: 1,
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			height: 36,
			borderRadius: 6,
			border: 0,
			fontSize: 14,
			fontWeight: 500,
			cursor: "pointer",
			background: active ? "var(--color-card)" : "transparent",
			color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
			boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none"
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				position: "fixed",
				inset: 0,
				zIndex: 60,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,.5)"
			},
			onClick: (e) => {
				if (e.target === e.currentTarget) onClose();
			},
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...card$1,
					width: "100%",
					maxWidth: 480,
					...narrow ? {
						margin: 16,
						maxHeight: "calc(100vh - 32px)",
						overflowY: "auto"
					} : {}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							padding: "16px 20px",
							borderBottom: "1px solid var(--color-border)"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							style: {
								fontSize: 14,
								fontWeight: 600,
								margin: 0
							},
							children: tr("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: 12,
								color: "var(--color-muted-foreground)",
								margin: "2px 0 0"
							},
							children: tr("subtitle", { n: total })
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: {
								border: 0,
								background: "transparent",
								cursor: "pointer",
								color: "var(--color-muted-foreground)",
								fontSize: 16
							},
							onClick: onClose,
							children: "✕"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: 16,
							display: "flex",
							flexDirection: "column",
							gap: 16
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 4,
								padding: 4,
								borderRadius: 8,
								border: "1px solid var(--color-border)",
								background: "color-mix(in srgb, var(--color-muted,#888) 12%, transparent)"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								style: tab(format === "xlsx"),
								disabled: !xlsx,
								onClick: () => xlsx && setFormat("xlsx"),
								title: xlsx ? "" : "XLSX indisponible",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExcelIcon, {}), "Excel (.xlsx)"]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								style: tab(format === "csv"),
								onClick: () => setFormat("csv"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CsvIcon, {}), "CSV (.csv)"]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "1fr 1fr",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: panelCss,
								onDragOver: (e) => {
									e.preventDefault();
									if (over?.id !== "__panel__" || over?.panel !== "excluded") setOver({
										id: "__panel__",
										panel: "excluded"
									});
								},
								onDrop: (e) => {
									e.preventDefault();
									drop("excluded");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: panelTitle$1,
									children: tr("excluded")
								}), excluded.length === 0 ? ph() : excluded.map((c) => item(c, "excluded"))]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: panelCss,
								onDragOver: (e) => {
									e.preventDefault();
									if (over?.id !== "__panel__" || over?.panel !== "included") setOver({
										id: "__panel__",
										panel: "included"
									});
								},
								onDrop: (e) => {
									e.preventDefault();
									drop("included");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: panelTitle$1,
									children: tr("included")
								}), included.length === 0 ? ph() : included.map((c) => item(c, "included"))]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "flex-end",
							gap: 8,
							padding: "12px 16px",
							borderTop: "1px solid var(--color-border)"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: btnGhost$1,
							onClick: onClose,
							disabled: exporting,
							children: tr("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							style: {
								...btnPrimary$1,
								opacity: included.length === 0 || exporting ? .6 : 1
							},
							onClick: doExport,
							disabled: exporting || included.length === 0,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DownloadIcon, {}), exporting ? tr("exporting") : tr("download", { fmt: format.toUpperCase() })]
						})]
					})
				]
			})
		});
	}
	//#endregion
	//#region src/ViewToggle.tsx
	var sIcon$2 = {
		width: 15,
		height: 15,
		flexShrink: 0
	};
	var SparkIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		style: sIcon$2,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" })
	});
	var LayoutIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: sIcon$2,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			x: "3",
			y: "3",
			width: "18",
			height: "18",
			rx: "2"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 9h18M9 21V9" })]
	});
	function ViewToggle({ mode, onChange, compact = false }) {
		const tab = (active) => ({
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			height: 30,
			padding: compact ? "0 8px" : "0 12px",
			borderRadius: 6,
			border: 0,
			fontSize: 12,
			fontWeight: 500,
			cursor: "pointer",
			background: active ? "var(--color-card)" : "transparent",
			color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
			boxShadow: active ? "0 1px 2px rgba(0,0,0,.06)" : "none"
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "inline-flex",
				gap: 4,
				padding: 4,
				borderRadius: 8,
				border: "1px solid var(--color-border)",
				background: "color-mix(in srgb, var(--color-muted,#888) 12%, transparent)"
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				style: tab(mode === "react"),
				onClick: () => onChange("react"),
				title: compact ? "New" : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SparkIcon, {}), !compact && "New"]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				style: tab(mode === "iframe"),
				onClick: () => onChange("iframe"),
				title: compact ? "Old" : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LayoutIcon, {}), !compact && "Old"]
			})]
		});
	}
	//#endregion
	//#region src/shared/ExpandableRow.tsx
	/**
	* Per-row "+" toggle (leftmost column of a table) that reveals the columns currently hidden
	* via column collapse on narrow viewports — same visibility source as the desktop ColManager,
	* just surfaced per-row. Pair with <HiddenColsRow>. Inline styles only — a brick can't use the
	* host's Tailwind classes.
	*/
	var sIcon$1 = {
		width: 13,
		height: 13,
		flexShrink: 0
	};
	var PlusIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		style: sIcon$1,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" })
	});
	var MinusIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		style: sIcon$1,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 12h14" })
	});
	function ExpandToggle({ expanded, onClick }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			onClick,
			"aria-expanded": expanded,
			style: {
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: 24,
				height: 24,
				borderRadius: 6,
				border: "1px solid var(--color-border)",
				background: "transparent",
				color: "var(--color-muted-foreground)",
				cursor: "pointer",
				padding: 0
			},
			children: expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MinusIcon, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlusIcon, {})
		});
	}
	/**
	* Detail row shown under an expanded row — one label/value pair per hidden column.
	* Two columns side by side on desktop; a single stacked column on narrow viewports (a 2-col
	* grid there fights for width against wrapped long values).
	*/
	function HiddenColsRow({ cols, labelFor, renderValue, colSpan, narrow }) {
		const hidden = cols.filter((c) => !c.visible);
		if (hidden.length === 0) return null;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
			colSpan,
			style: {
				padding: "10px 16px",
				borderTop: "1px solid var(--color-border)",
				background: "var(--color-muted,rgba(0,0,0,.02))",
				width: 0
			},
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "grid",
					gridTemplateColumns: !narrow && hidden.length > 1 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
					columnGap: 24,
					rowGap: 10
				},
				children: hidden.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: "auto minmax(0, 1fr)",
						alignItems: "baseline",
						gap: 8,
						fontSize: 13
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							fontSize: 11,
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: ".04em",
							color: "var(--color-muted-foreground)"
						},
						children: [labelFor(c.id), ":"]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							minWidth: 0,
							maxWidth: 220,
							overflowWrap: "break-word"
						},
						children: renderValue(c.id)
					})]
				}, c.id))
			})
		}) });
	}
	//#endregion
	//#region src/SiteRobotPage.tsx
	var MELIS_KEY = "site_robot_tool_display";
	/** Icône de tri unifiée — mêmes tracés que les icônes lucide ArrowUpDown/ArrowUp/ArrowDown du core. */
	function SortIcon({ dir }) {
		const p = {
			width: 12,
			height: 12,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			style: {
				flexShrink: 0,
				opacity: dir ? 1 : .3
			}
		};
		if (dir === "asc") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			...p,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 12 7-7 7 7" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 19V5" })]
		});
		if (dir === "desc") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			...p,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5v14" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m19 12-7 7-7-7" })]
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			...p,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 16-4 4-4-4" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 20V4" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3 8 4-4 4 4" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 4v16" })
			]
		});
	}
	var CAPS_KEY = "meliscms_site_robot_tools_section";
	function can(cap) {
		return window.MelisCan?.(CAPS_KEY, cap) ?? true;
	}
	function currentLang() {
		return (document.documentElement.lang || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
	}
	var DICT = {
		fr: {
			title: "Robots.txt",
			subtitle: "Fichier robots.txt par domaine de site",
			search: "Rechercher un domaine…",
			empty: "Aucun domaine trouvé",
			count: "{n} domaines — fin de la liste",
			kpi_total: "Domaines",
			kpi_with: "Avec robots.txt",
			kpi_without: "Sans robots.txt",
			all_sites: "Tous les sites",
			col_id: "ID",
			col_domain: "Domaine",
			col_site: "Site",
			col_env: "Env.",
			col_robots: "robots.txt",
			robots_yes: "Défini",
			robots_no: "Aucun",
			columns: "Colonnes",
			export: "Exporter",
			cols_visible: "Visibles",
			cols_hidden: "Masquées",
			drag_here: "Glisser ici",
			reset: "Réinitialiser",
			reset_filters: "Réinitialiser les filtres",
			edit: "Éditer le robots.txt",
			del: "Effacer le robots.txt",
			cancel: "Annuler",
			save: "Enregistrer",
			back: "retour",
			refresh: "Rafraîchir",
			loading: "Chargement…",
			saved: "Enregistré ✓",
			del_title: "Effacer le robots.txt",
			del_confirm: "Effacer le robots.txt du domaine « {n} » ? Le domaine n’est pas supprimé.",
			edit_title: "robots.txt — {n}",
			f_domain: "Domaine",
			f_site: "Site",
			f_robot: "Contenu du robots.txt",
			f_robot_hint: "Le contenu servi à /robots.txt pour ce domaine. Laisser vide pour ne rien servir.",
			f_robot_ph: "User-agent: *\nDisallow:",
			export_filename: "domaines-robots",
			err_save: "Erreur lors de la sauvegarde",
			no_access: "Vous n’avez pas les droits pour consulter cette liste."
		},
		en: {
			title: "Robots.txt",
			subtitle: "Per-domain robots.txt file",
			search: "Search a domain…",
			empty: "No domain found",
			count: "{n} domains — end of list",
			kpi_total: "Domains",
			kpi_with: "With robots.txt",
			kpi_without: "Without robots.txt",
			all_sites: "All sites",
			col_id: "ID",
			col_domain: "Domain",
			col_site: "Site",
			col_env: "Env.",
			col_robots: "robots.txt",
			robots_yes: "Set",
			robots_no: "None",
			columns: "Columns",
			export: "Export",
			cols_visible: "Visible",
			cols_hidden: "Hidden",
			drag_here: "Drag here",
			reset: "Reset",
			reset_filters: "Reset filters",
			edit: "Edit robots.txt",
			del: "Clear robots.txt",
			cancel: "Cancel",
			save: "Save",
			back: "back",
			refresh: "Refresh",
			loading: "Loading…",
			saved: "Saved ✓",
			del_title: "Clear robots.txt",
			del_confirm: "Clear the robots.txt of domain “{n}”? The domain itself is not deleted.",
			edit_title: "robots.txt — {n}",
			f_domain: "Domain",
			f_site: "Site",
			f_robot: "robots.txt content",
			f_robot_hint: "The content served at /robots.txt for this domain. Leave empty to serve nothing.",
			f_robot_ph: "User-agent: *\nDisallow:",
			export_filename: "domain-robots",
			err_save: "Error while saving",
			no_access: "You do not have permission to view this list."
		}
	};
	function useT() {
		const lang = currentLang();
		return (key, vars) => {
			let s = DICT[lang][key] ?? key;
			if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
			return s;
		};
	}
	function notify(kind, title, message) {
		window.postMessage({
			__melisNotif: true,
			kind,
			title,
			message
		}, "*");
	}
	var card = {
		border: "1px solid var(--color-border)",
		background: "var(--color-card)",
		borderRadius: 12,
		boxShadow: "0 1px 2px rgba(0,0,0,.04)"
	};
	var inputCss = {
		height: 40,
		width: "100%",
		boxSizing: "border-box",
		borderRadius: 8,
		border: "1px solid var(--color-input,var(--color-border))",
		background: "var(--color-card)",
		color: "var(--color-foreground)",
		padding: "0 12px",
		fontSize: 14,
		outline: "none"
	};
	var btnPrimary = {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		height: 36,
		padding: "0 14px",
		borderRadius: 8,
		border: 0,
		background: "var(--color-primary)",
		color: "var(--color-primary-foreground,#fff)",
		fontSize: 14,
		fontWeight: 500,
		cursor: "pointer"
	};
	var btnGhost = {
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		height: 36,
		padding: "0 12px",
		borderRadius: 8,
		border: "1px solid var(--color-border)",
		background: "var(--color-card)",
		color: "var(--color-foreground)",
		fontSize: 14,
		cursor: "pointer"
	};
	var iconBtn = {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		width: 28,
		height: 28,
		borderRadius: 6,
		border: 0,
		background: "transparent",
		color: "var(--color-muted-foreground)",
		cursor: "pointer"
	};
	var th = {
		textAlign: "left",
		padding: "10px 16px",
		fontSize: 11,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: ".04em",
		color: "var(--color-muted-foreground)",
		whiteSpace: "nowrap"
	};
	var td = {
		padding: "10px 16px",
		fontSize: 14,
		color: "var(--color-foreground)",
		borderTop: "1px solid var(--color-border)"
	};
	var label = {
		display: "block",
		fontSize: 13,
		fontWeight: 500,
		marginBottom: 4,
		color: "var(--color-foreground)"
	};
	var hint = {
		marginTop: 4,
		fontSize: 12,
		color: "var(--color-muted-foreground)"
	};
	var sIcon = {
		width: 15,
		height: 15,
		flexShrink: 0
	};
	var PencilIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: sIcon,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 20h9" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })]
	});
	var TrashIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		style: sIcon,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" })
	});
	var GripIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: {
			width: 13,
			height: 13,
			flexShrink: 0,
			color: "var(--color-muted-foreground)"
		},
		viewBox: "0 0 24 24",
		fill: "currentColor",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "6",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "6",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "12",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "12",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "18",
				r: "1.5"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "15",
				cy: "18",
				r: "1.5"
			})
		]
	});
	var ResetIcon = () => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		style: sIcon,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 2v6h6" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 13a9 9 0 1 0 3-7.7L3 8" })]
	});
	var COL_ORDER = [
		"id",
		"domain",
		"site",
		"env",
		"robots"
	];
	var COL_LABEL = {
		id: "col_id",
		domain: "col_domain",
		site: "col_site",
		env: "col_env",
		robots: "col_robots"
	};
	var DEFAULT_COLS = COL_ORDER.map((id) => ({
		id,
		visible: id !== "id"
	}));
	var ESSENTIAL_COLS = new Set(["domain"]);
	var COL_KEY = "melis-site-robot-cols-v1";
	function loadCols() {
		try {
			const raw = localStorage.getItem(COL_KEY);
			if (!raw) return DEFAULT_COLS;
			const saved = JSON.parse(raw);
			const ordered = saved.map((s) => {
				const d = DEFAULT_COLS.find((c) => c.id === s.id);
				return d ? {
					id: d.id,
					visible: s.visible
				} : null;
			}).filter(Boolean);
			const missing = DEFAULT_COLS.filter((d) => !saved.find((s) => s.id === d.id));
			return [...ordered, ...missing];
		} catch {
			return DEFAULT_COLS;
		}
	}
	function saveCols(c) {
		try {
			localStorage.setItem(COL_KEY, JSON.stringify(c));
		} catch {}
	}
	var visibleCols = (c) => c.filter((x) => x.visible);
	var panelTitle = {
		padding: "0 6px 4px",
		fontSize: 10,
		fontWeight: 600,
		textTransform: "uppercase",
		letterSpacing: ".06em",
		color: "var(--color-muted-foreground)"
	};
	function ColManager({ anchorRef, cols, labelFor, onChange, onClose }) {
		const t = useT();
		const narrow = useIsNarrow();
		const [dragId, setDragId] = (0, react.useState)(null);
		const [over, setOver] = (0, react.useState)(null);
		const [pos, setPos] = (0, react.useState)(null);
		const shown = cols.filter((c) => c.visible);
		const hidden = cols.filter((c) => !c.visible);
		const panelCss = {
			display: "flex",
			flexDirection: "column",
			gap: 2,
			minHeight: narrow ? 90 : 130,
			maxHeight: narrow ? "min(30vh, 200px)" : "min(48vh, 320px)",
			overflowY: "auto",
			minWidth: 0,
			borderRadius: 8,
			border: "1px dashed var(--color-border)",
			padding: 6
		};
		(0, react.useLayoutEffect)(() => {
			const anchor = anchorRef.current;
			if (!anchor) return;
			const rect = anchor.getBoundingClientRect();
			const margin = 8;
			const spaceBelow = window.innerHeight - rect.bottom - margin;
			const spaceAbove = rect.top - margin;
			const width = Math.min(380, window.innerWidth - margin * 2);
			const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
			if (spaceBelow >= 200 || spaceBelow >= spaceAbove) setPos({
				top: rect.bottom + 6,
				left,
				width,
				maxHeight: Math.max(160, spaceBelow - 6)
			});
			else setPos({
				bottom: window.innerHeight - rect.top + 6,
				left,
				width,
				maxHeight: Math.max(160, spaceAbove - 6)
			});
		}, [anchorRef]);
		function drop(panel) {
			if (!dragId) return;
			const upd = {
				...cols.find((c) => c.id === dragId),
				visible: panel === "visible"
			};
			let vList = shown.filter((c) => c.id !== dragId);
			const hList = hidden.filter((c) => c.id !== dragId);
			if (panel === "visible") {
				const dst = over?.id;
				if (!dst || dst === "__panel__") vList = [...vList, upd];
				else {
					const i = vList.findIndex((c) => c.id === dst);
					vList = i === -1 ? [...vList, upd] : [
						...vList.slice(0, i),
						upd,
						...vList.slice(i)
					];
				}
				const next = [...vList, ...hList];
				onChange(next);
				saveCols(next);
			} else {
				const next = [
					...vList,
					...hList,
					upd
				];
				onChange(next);
				saveCols(next);
			}
			setDragId(null);
			setOver(null);
		}
		function item(col, panel) {
			const isOver = over?.id === col.id && over?.panel === panel;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				draggable: true,
				onDragStart: () => setDragId(col.id),
				onDragEnd: () => {
					setDragId(null);
					setOver(null);
				},
				onDragOver: (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (over?.id !== col.id || over?.panel !== panel) setOver({
						id: col.id,
						panel
					});
				},
				onDrop: (e) => {
					e.preventDefault();
					drop(panel);
				},
				style: {
					display: "flex",
					alignItems: "center",
					gap: 8,
					borderRadius: 8,
					padding: "6px 8px",
					fontSize: 14,
					cursor: "grab",
					userSelect: "none",
					opacity: dragId === col.id ? .4 : 1,
					background: isOver ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GripIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						flex: 1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					},
					children: labelFor(col.id)
				})]
			}, col.id);
		}
		if (!pos) return null;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				...card,
				position: "fixed",
				left: pos.left,
				zIndex: 50,
				width: pos.width,
				maxHeight: pos.maxHeight,
				overflowY: "auto",
				display: "flex",
				flexDirection: "column",
				...pos.top != null ? { top: pos.top } : { bottom: pos.bottom }
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "10px 12px",
						borderBottom: "1px solid var(--color-border)"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 14,
							fontWeight: 600
						},
						children: t("columns")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: {
							...iconBtn,
							width: 22,
							height: 22
						},
						onClick: onClose,
						children: "✕"
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "1fr 1fr",
						gap: 8,
						padding: 12
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: panelCss,
						onDragOver: (e) => {
							e.preventDefault();
							if (over?.id !== "__panel__" || over?.panel !== "hidden") setOver({
								id: "__panel__",
								panel: "hidden"
							});
						},
						onDrop: (e) => {
							e.preventDefault();
							drop("hidden");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: panelTitle,
							children: t("cols_hidden")
						}), hidden.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								flex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 11,
								color: "var(--color-muted-foreground)",
								opacity: .5,
								padding: "16px 0"
							},
							children: t("drag_here")
						}) : hidden.map((c) => item(c, "hidden"))]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: panelCss,
						onDragOver: (e) => {
							e.preventDefault();
							if (over?.id !== "__panel__" || over?.panel !== "visible") setOver({
								id: "__panel__",
								panel: "visible"
							});
						},
						onDrop: (e) => {
							e.preventDefault();
							drop("visible");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: panelTitle,
							children: t("cols_visible")
						}), shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								flex: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 11,
								color: "var(--color-muted-foreground)",
								opacity: .5,
								padding: "16px 0"
							},
							children: t("drag_here")
						}) : shown.map((c) => item(c, "visible"))]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						borderTop: "1px solid var(--color-border)",
						padding: 6
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: {
							...btnGhost,
							width: "100%",
							height: 30,
							border: 0,
							justifyContent: "center",
							color: "var(--color-muted-foreground)"
						},
						onClick: () => {
							onChange(DEFAULT_COLS);
							saveCols(DEFAULT_COLS);
						},
						children: t("reset")
					})
				})
			]
		});
	}
	function Kpi({ label: lbl, value, narrow }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				...card,
				display: "flex",
				flexDirection: "column",
				gap: 2,
				padding: narrow ? 12 : 16,
				flex: 1,
				minWidth: narrow ? 92 : 140
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontSize: 12,
					color: "var(--color-muted-foreground)"
				},
				children: lbl
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					fontSize: narrow ? 18 : 22,
					fontWeight: 700
				},
				children: value == null ? "…" : value
			})]
		});
	}
	function RobotsBadge({ has, labelOn, labelOff }) {
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			style: {
				display: "inline-flex",
				alignItems: "center",
				gap: 6,
				padding: "2px 8px",
				borderRadius: 6,
				fontSize: 12,
				fontWeight: 500,
				background: has ? "color-mix(in srgb, #10b981 14%, transparent)" : "var(--color-muted,rgba(0,0,0,.06))",
				color: has ? "#059669" : "var(--color-muted-foreground)"
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
				width: 6,
				height: 6,
				borderRadius: "50%",
				background: has ? "#10b981" : "var(--color-muted-foreground)"
			} }), has ? labelOn : labelOff]
		});
	}
	function SiteRobotPage({ active = true }) {
		const { id } = (0, react_router_dom.useParams)();
		const location = (0, react_router_dom.useLocation)();
		const [frozen, setFrozen] = (0, react.useState)({
			id,
			pathname: location.pathname
		});
		(0, react.useEffect)(() => {
			if (active) setFrozen({
				id,
				pathname: location.pathname
			});
		}, [
			active,
			id,
			location.pathname
		]);
		const effId = active ? id : frozen.id;
		const effPath = active ? location.pathname : frozen.pathname;
		const base = effId ? effPath.slice(0, effPath.length - effId.length - 1) : effPath;
		if (effId) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RobotForm, {
			id: effId,
			base
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DomainList, { base });
	}
	function DomainList({ base }) {
		const t = useT();
		const narrow = useIsNarrow();
		const navigate = (0, react_router_dom.useNavigate)();
		const [stats, setStats] = (0, react.useState)(null);
		const [sites, setSites] = (0, react.useState)([]);
		const [searchInput, setSearchInput] = (0, react.useState)("");
		const [search, setSearch] = (0, react.useState)("");
		const [site, setSite] = (0, react.useState)(null);
		const [toDelete, setToDelete] = (0, react.useState)(null);
		const [tick, setTick] = (0, react.useState)(0);
		const [cols, setCols] = (0, react.useState)(loadCols);
		const colsAnchorRef = (0, react.useRef)(null);
		const [showCols, setShowCols] = (0, react.useState)(false);
		const [showExport, setShowExport] = (0, react.useState)(false);
		const [mode, setMode] = (0, react.useState)("react");
		const [frameLoaded, setFrameLoaded] = (0, react.useState)(false);
		const [expanded, setExpanded] = (0, react.useState)(/* @__PURE__ */ new Set());
		const toggleExpand = (rid) => setExpanded((s) => {
			const n = new Set(s);
			n.has(rid) ? n.delete(rid) : n.add(rid);
			return n;
		});
		const displayCols = narrow ? cols.map((c) => ({
			...c,
			visible: ESSENTIAL_COLS.has(c.id)
		})) : cols;
		const hasHidden = narrow;
		const { items, total, loading, hasMore, sentinelRef, sortCol, sortDir, toggleSort } = useKeysetList({
			fetcher: (a) => fetchDomains({
				search,
				site,
				limit: a.limit,
				sort: a.sort,
				dir: a.dir,
				after: a.after
			}).then((r) => ({
				items: r.items,
				total: r.total,
				nextCursor: r.nextCursor
			})),
			deps: [
				search,
				site,
				tick
			],
			defaultSort: "id",
			defaultDir: "desc"
		});
		(0, react.useEffect)(() => {
			fetchRobotStats().then(setStats).catch(() => null);
		}, [tick]);
		(0, react.useEffect)(() => {
			fetchSites().then(setSites).catch(() => null);
		}, []);
		(0, react.useEffect)(() => {
			if (consumeRobotListStale()) setTick((x) => x + 1);
		}, []);
		function resetFilters() {
			setSearchInput("");
			setSearch("");
			setSite(null);
			setTick((x) => x + 1);
		}
		async function confirmDelete() {
			if (!toDelete) return;
			try {
				await deleteRobot(toDelete.id);
				setToDelete(null);
				setTick((x) => x + 1);
			} catch {
				setToDelete(null);
			}
		}
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: narrow ? 16 : 24,
				height: "100%",
				boxSizing: "border-box",
				overflow: "auto"
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 16
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: narrow ? { minWidth: 0 } : void 0,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								margin: 0,
								...narrow ? {
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								} : {}
							},
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: {
								fontSize: 14,
								color: "var(--color-muted-foreground)",
								margin: "2px 0 0",
								...narrow ? {
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								} : {}
							},
							children: t("subtitle")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							...narrow ? { flexShrink: 0 } : {}
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewToggle, {
							mode,
							compact: narrow,
							onChange: (m) => {
								setMode(m);
								if (m === "iframe") setFrameLoaded(true);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: {
								...btnGhost,
								...narrow ? { padding: "0 10px" } : {}
							},
							onClick: () => setTick((x) => x + 1),
							title: t("refresh"),
							children: "↻"
						})]
					})]
				}),
				frameLoaded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...card,
						display: mode === "iframe" ? "flex" : "none",
						flex: 1,
						minHeight: 480,
						overflow: "hidden"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
						src: `/melis/react-tool-page?key=${encodeURIComponent(MELIS_KEY)}`,
						style: {
							flex: 1,
							width: "100%",
							border: 0
						},
						title: "Robots — Vue Melis",
						sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: mode === "react" ? "flex" : "none",
						flexDirection: "column",
						gap: 20
					},
					children: !can("list") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...card,
							padding: "40px 16px",
							textAlign: "center",
							fontSize: 14,
							color: "var(--color-muted-foreground)"
						},
						children: t("no_access")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: narrow ? 8 : 12,
								flexWrap: "wrap"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Kpi, {
									label: t("kpi_total"),
									value: stats?.total ?? null,
									narrow
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Kpi, {
									label: t("kpi_with"),
									value: stats?.withRobots ?? null,
									narrow
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Kpi, {
									label: t("kpi_without"),
									value: stats?.withoutRobots ?? null,
									narrow
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8,
								flexWrap: "wrap",
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: {
										...inputCss,
										height: 36,
										flex: narrow ? "1 1 100%" : 1,
										minWidth: narrow ? 0 : 220
									},
									value: searchInput,
									onChange: (e) => setSearchInput(e.target.value),
									onKeyDown: (e) => e.key === "Enter" && setSearch(searchInput.trim()),
									placeholder: t("search")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									style: {
										...inputCss,
										height: 36,
										width: narrow ? "100%" : "auto"
									},
									value: site ?? "",
									onChange: (e) => setSite(e.target.value ? Number(e.target.value) : null),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("all_sites")
									}), sites.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: s.id,
										children: s.name
									}, s.id))]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									style: {
										...btnGhost,
										height: 36,
										...narrow ? {
											flex: "1 1 100%",
											justifyContent: "center"
										} : {}
									},
									onClick: resetFilters,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ResetIcon, {}), t("reset_filters")]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									ref: colsAnchorRef,
									style: {
										position: "relative",
										...narrow ? { flex: "1 1 calc(50% - 4px)" } : {}
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										style: {
											...btnGhost,
											height: 36,
											...narrow ? {
												width: "100%",
												justifyContent: "center"
											} : {}
										},
										onClick: () => setShowCols((v) => !v),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GripIcon, {}), t("columns")]
									}), showCols && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ColManager, {
										anchorRef: colsAnchorRef,
										cols,
										labelFor: (id) => t(COL_LABEL[id]),
										onChange: setCols,
										onClose: () => setShowCols(false)
									})]
								}),
								can("export") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									style: {
										...btnGhost,
										height: 36,
										...narrow ? {
											flex: "1 1 calc(50% - 4px)",
											justifyContent: "center"
										} : {}
									},
									onClick: () => setShowExport(true),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DownloadIcon, {}), t("export")]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...card,
								overflow: "hidden"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									style: {
										width: "100%",
										borderCollapse: "collapse",
										...narrow ? {} : { minWidth: 640 }
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", {
										style: { background: "var(--color-muted,rgba(0,0,0,.03))" },
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											hasHidden && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { style: {
												...th,
												width: 32,
												padding: "10px 8px"
											} }),
											visibleCols(displayCols).map(({ id }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												style: {
													...th,
													cursor: "pointer",
													...id === "id" ? { width: 70 } : {},
													...id === "robots" ? { width: 120 } : {},
													...narrow ? { padding: "10px 8px" } : {},
													...sortCol === id ? { color: "var(--color-primary)" } : {}
												},
												onClick: () => toggleSort(id),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														display: "inline-flex",
														alignItems: "center",
														gap: 4
													},
													children: [t(COL_LABEL[id]), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortIcon, { dir: sortCol === id ? sortDir : null })]
												})
											}, id)),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { style: {
												...th,
												...narrow ? { padding: "10px 8px" } : { width: 80 }
											} })
										] })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: items.length === 0 && !loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										style: {
											...td,
											textAlign: "center",
											color: "var(--color-muted-foreground)",
											padding: "40px 16px"
										},
										colSpan: visibleCols(displayCols).length + (hasHidden ? 1 : 0) + 1,
										children: t("empty")
									}) }) : items.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										hasHidden && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											style: {
												...td,
												padding: "10px 8px"
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExpandToggle, {
												expanded: expanded.has(r.id),
												onClick: () => toggleExpand(r.id)
											})
										}),
										visibleCols(displayCols).map(({ id }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
											style: {
												...td,
												...id === "id" ? {
													color: "var(--color-muted-foreground)",
													fontVariantNumeric: "tabular-nums"
												} : {},
												...id === "domain" ? {
													fontFamily: "monospace",
													fontSize: 13
												} : {},
												...narrow ? {
													padding: "10px 8px",
													overflowWrap: "anywhere"
												} : {}
											},
											children: [
												id === "id" && r.id,
												id === "domain" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													onClick: () => navigate(`${base}/${r.id}`),
													style: {
														background: "transparent",
														border: 0,
														padding: 0,
														color: "var(--color-foreground)",
														fontFamily: "monospace",
														fontSize: 13,
														fontWeight: 600,
														cursor: "pointer",
														textAlign: "left",
														...narrow ? {
															whiteSpace: "normal",
															overflowWrap: "anywhere"
														} : {}
													},
													children: r.scheme ? `${r.scheme}://${r.domain}` : r.domain
												}),
												id === "site" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: { fontWeight: 500 },
													children: r.siteName
												}),
												id === "env" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: { color: "var(--color-muted-foreground)" },
													children: r.env
												}),
												id === "robots" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RobotsBadge, {
													has: r.hasRobots,
													labelOn: t("robots_yes"),
													labelOff: t("robots_no")
												})
											]
										}, id)),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											style: {
												...td,
												...narrow ? { padding: "10px 8px" } : {}
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: {
													display: "flex",
													justifyContent: "flex-end",
													gap: 4
												},
												children: [can("edit") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													style: iconBtn,
													title: t("edit"),
													onClick: () => navigate(`${base}/${r.id}`),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PencilIcon, {})
												}), can("delete") && r.hasRobots && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													style: {
														...iconBtn,
														color: "var(--color-destructive,#ef4444)"
													},
													title: t("del"),
													onClick: () => setToDelete(r),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrashIcon, {})
												})]
											})
										})
									] }), hasHidden && expanded.has(r.id) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HiddenColsRow, {
										cols: displayCols,
										labelFor: (id) => t(COL_LABEL[id]),
										renderValue: (id) => id === "id" ? r.id : id === "domain" ? r.scheme ? `${r.scheme}://${r.domain}` : r.domain : id === "site" ? r.siteName : id === "env" ? r.env : id === "robots" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RobotsBadge, {
											has: r.hasRobots,
											labelOn: t("robots_yes"),
											labelOff: t("robots_no")
										}) : "",
										colSpan: visibleCols(displayCols).length + 2,
										narrow
									})] }, r.id)) })]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									ref: sentinelRef,
									style: { height: 1 }
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "10px 16px",
										textAlign: "center",
										fontSize: 12,
										color: "var(--color-muted-foreground)"
									},
									children: loading ? t("loading") : !hasMore && items.length > 0 ? t("count", { n: total }) : ""
								})
							]
						})
					] })
				}),
				toDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "fixed",
						inset: 0,
						zIndex: 50,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,.5)",
						...narrow ? { padding: 16 } : {}
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...card,
							padding: narrow ? 20 : 24,
							width: "100%",
							maxWidth: 380
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								style: {
									fontSize: 16,
									fontWeight: 600,
									margin: 0
								},
								children: t("del_title")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									fontSize: 14,
									color: "var(--color-muted-foreground)",
									marginTop: 8
								},
								children: t("del_confirm", { n: toDelete.domain })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "flex-end",
									gap: 8,
									marginTop: 20
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: btnGhost,
									onClick: () => setToDelete(null),
									children: t("cancel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: {
										...btnGhost,
										borderColor: "#fca5a5",
										color: "#dc2626"
									},
									onClick: confirmDelete,
									children: t("del")
								})]
							})
						]
					})
				}),
				showExport && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportModal, {
					cols,
					labelFor: (id) => t(COL_LABEL[id]),
					fetchAll: async () => {
						const all = [];
						let after = null;
						do {
							const r = await fetchDomains({
								search,
								site,
								limit: 100,
								sort: sortCol,
								dir: sortDir,
								after
							});
							all.push(...r.items);
							after = r.nextCursor;
						} while (after);
						return all;
					},
					getCell: (r, id) => id === "id" ? r.id : id === "domain" ? r.domain : id === "site" ? r.siteName : id === "env" ? r.env : id === "robots" ? r.hasRobots ? t("robots_yes") : t("robots_no") : "",
					filename: t("export_filename"),
					sheetName: t("title"),
					total,
					onClose: () => setShowExport(false)
				})
			]
		});
	}
	function RobotForm({ id, base }) {
		const t = useT();
		const narrow = useIsNarrow();
		const navigate = (0, react_router_dom.useNavigate)();
		const domainId = parseInt(id);
		const [domain, setDomain] = (0, react.useState)("");
		const [siteName, setSiteName] = (0, react.useState)("");
		const [robotText, setRobotText] = (0, react.useState)("");
		const [loading, setLoading] = (0, react.useState)(true);
		const [saving, setSaving] = (0, react.useState)(false);
		const [error, setError] = (0, react.useState)(null);
		const [saved, setSaved] = (0, react.useState)(false);
		const subTabId = `${base}/${id}`;
		(0, react.useEffect)(() => {
			window.__melisOpenSubTab?.(base, {
				id: subTabId,
				label: t("loading"),
				path: subTabId
			});
		}, []);
		(0, react.useEffect)(() => {
			if (domain) window.__melisUpdateSubTabLabel?.(base, subTabId, domain);
		}, [domain]);
		(0, react.useEffect)(() => {
			if (!can("edit")) navigate(base);
		}, [navigate]);
		(0, react.useEffect)(() => {
			setLoading(true);
			fetchDomainById(domainId).then((d) => {
				setDomain(d.domain);
				setSiteName(d.siteName);
				setRobotText(d.robotText);
			}).catch(() => navigate(base)).finally(() => setLoading(false));
		}, [domainId]);
		async function submit() {
			setError(null);
			setSaving(true);
			try {
				await saveRobot({
					id: domainId,
					robotText
				});
				setSaved(true);
				markRobotListStale();
				notify("ok", t("title"), t("saved"));
				setTimeout(() => navigate(base), 500);
			} catch (e) {
				setError(e instanceof Error ? e.message : t("err_save"));
			} finally {
				setSaving(false);
			}
		}
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: narrow ? 16 : 24,
				height: "100%",
				boxSizing: "border-box",
				overflow: "auto"
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 16
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: narrow ? { minWidth: 0 } : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
							style: {
								fontSize: 20,
								fontWeight: 700,
								margin: 0,
								...narrow ? {
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								} : {}
							},
							children: t("edit_title", { n: domain || "#" + id })
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							...narrow ? { flexShrink: 0 } : {}
						},
						children: [saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 14,
								color: "#059669"
							},
							children: t("saved")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: btnPrimary,
							onClick: submit,
							disabled: saving || loading,
							children: saving ? "…" : t("save")
						})]
					})]
				}),
				error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...card,
						borderColor: "#fca5a5",
						background: "#fef2f2",
						color: "#b91c1c",
						padding: "8px 14px",
						fontSize: 14
					},
					children: error
				}),
				loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: 48,
						textAlign: "center",
						color: "var(--color-muted-foreground)"
					},
					children: t("loading")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...card,
						padding: narrow ? 16 : 20,
						maxWidth: 820,
						display: "flex",
						flexDirection: "column",
						gap: 16
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 16,
							flexWrap: "wrap"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: narrow ? "1 1 100%" : 1,
								minWidth: narrow ? 0 : 220
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: label,
								children: t("f_domain")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: {
									...inputCss,
									fontFamily: "monospace",
									opacity: .75
								},
								value: domain,
								readOnly: true
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								flex: narrow ? "1 1 100%" : 1,
								minWidth: narrow ? 0 : 180
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: label,
								children: t("f_site")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: {
									...inputCss,
									opacity: .75
								},
								value: siteName,
								readOnly: true
							})]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: label,
							children: t("f_robot")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: robotText,
							onChange: (e) => setRobotText(e.target.value),
							placeholder: t("f_robot_ph"),
							spellCheck: false,
							style: {
								...inputCss,
								height: narrow ? 240 : 320,
								padding: 12,
								resize: "vertical",
								fontFamily: "monospace",
								fontSize: 13,
								lineHeight: 1.5,
								whiteSpace: "pre"
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: hint,
							children: t("f_robot_hint")
						})
					] })]
				})
			]
		});
	}
	//#endregion
	//#region src/brick.tsx
	window.__melisRegisterBrick?.({
		id: "siterobot",
		Component: SiteRobotPage
	});
	//#endregion
})(MelisReact, MelisReactRouterDOM, MelisReactJsxRuntime);
