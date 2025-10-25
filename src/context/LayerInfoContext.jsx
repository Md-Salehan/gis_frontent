import { createContext, useEffect } from "react";

const LayerInfoContext = createContext({});
export default LayerInfoContext;


function LayerInfoProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggle = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []); // stable identity

  // useMemo ensures `value` object identity only changes when `theme` or `toggle` changes
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);




    const [layerInfo, setLayerInfo] = useState({})
  const fetchLAyers = async (portal_id) => {
    await axios
      .post(
        import.meta.env.VITE_SERVER_PREFIX + "layers/list/",
        {
          portal_id: portal_id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )
      .then((res) => {
        setLayerInfo(res.data)
      })
      .catch((err) => console.log(err))
      .finally(() => {});
  };

  useEffect(() => {
    fetchLAyers(portal_id);
  }, []);

  return <LayerInfoContext.Provider value={value}>{children}</LayerInfoContext.Provider>;
}