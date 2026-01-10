import { useNavigate } from "react-router-dom";
import { DocumentAPIHelper } from "../../api/document";

export const HomePage = () => {
    const navigate = useNavigate();
    const createAndNavigateToDocument = async()=>{
        const docID = await DocumentAPIHelper.createDocument();
        if(docID){
            navigate(`/${docID}`);
        }
    }
    return (
        //this is just for a proof of concept
        //Will make this better in a bit
        <div className="h-screen w-full flex justify-center items-center">
            <button
                className="btn btn-xl btn-neutral"
                onClick={createAndNavigateToDocument}
                > Create a document!</button>
        </div>
    );
}