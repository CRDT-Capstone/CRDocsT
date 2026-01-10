import { BrowserRouter, Route, Routes } from "react-router-dom";
import CodeMirrorCanvas from "./components/CodeMirrorCanvas";
import { HomePage } from "./components/HomePage";

export const App = ()=>{
    return(
        <BrowserRouter>
            <Routes>
                <Route path= '/:documentID' element={<CodeMirrorCanvas/>}/>
                <Route path = '/' element={<HomePage/>}/>
            </Routes>
        </BrowserRouter>
    );
}