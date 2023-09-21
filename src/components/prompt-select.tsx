import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "@/lib/axios";

interface Prompt {
    id: string;
    title: string;
    template: string;
}

interface PromptSelectedProps{
    onPromptSelected: (template: string) => void
}

export function PromptSelect({onPromptSelected} : PromptSelectedProps) {
    //COMO POSSO IMPLEMENTAR REACT QUERY AQUI?
    const [prompts, setPrompts] = useState<Prompt[] | null>(null);

    useEffect(() => {
        api.get('/prompts')
            .then(
                response => {
                    setPrompts(response.data)
                }
            )
    }, [])

    function handlePromptSelected(promptId: string){
        const selectedPrompt = prompts?.find(prompt => prompt.id === promptId)

        if(!selectedPrompt){
            return
        }

        onPromptSelected(selectedPrompt?.template)
    }

    return (
        <Select onValueChange={handlePromptSelected}>
            <SelectTrigger>
                <SelectValue placeholder='Selecione um prompt...' />
            </SelectTrigger>
            <SelectContent>
                {prompts?.map(prompt => {
                    return (
                        <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.title}
                        </SelectItem>
                    )
                })}
            </SelectContent>
        </Select>
    );
}