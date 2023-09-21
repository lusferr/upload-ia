import { Label } from "@radix-ui/react-label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from '@ffmpeg/util'
import { api } from "@/lib/axios";

interface VideoInputFormProps {
    onVideoUploaded: (id: string) => void
}

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMesages = {
    converting: 'Convertendo...',
    generating: 'Transcrevendo...',
    uploading: 'Carregando...',
    success: 'Sucesso!'
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('waiting');
    const promptInpuRef = useRef<HTMLTextAreaElement>(null);

    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
        const { files } = event.currentTarget

        if (!files) {
            return
        }

        const selectedFile = files[0]
        setVideoFile(selectedFile)
    }

    async function convertVideoToAudio(video: File) {
        console.log('começo')

        const ffmpeg = await getFFmpeg()

        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        // ffmpeg.on('log', log => {
        //     console.log(log)
        // })

        ffmpeg.on('progress', progress => {
            console.log('Progresso: ' + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3'
        ])

        const data = await ffmpeg.readFile('output.mp3')

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg',
        })

        console.log('fim')
        return audioFile
    }

    async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const prompt = promptInpuRef.current?.value

        if (!videoFile) {
            return
        }

        //converter video em audio
        setStatus('converting')
        const audioFile = await convertVideoToAudio(videoFile)

        const data = new FormData()

        data.append('file', audioFile)

        setStatus('uploading')
        const response = await api.post('/videos', data)

        const videoId = response.data.video.id

        setStatus('generating')

        await api.post(`/videos/${videoId}/transcription`, {
            prompt,
        })

        setStatus('success')
        onVideoUploaded(videoId)
    }

    const previewURL = useMemo(() => {
        if (!videoFile) {
            return null
        }

        return URL.createObjectURL(videoFile)
    }, [videoFile])

    return (
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label
                htmlFor="video"
                className='relative flex flex-col rounded-md aspect-video cursor-pointer border border-dashed text-sm gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5 transition-colors'
            >
                {
                    previewURL
                        ?
                        <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
                        :
                        <>
                            <FileVideo className='w-5 h-5' />
                            Selecione um vídeo
                        </>
                }
            </label>

            <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />

            <Separator />

            <div className='space-y-2'>
                <Label htmlFor='transcription_prompt'>Prompt de transcrição</Label>
                <Textarea
                    disabled={status != 'waiting'}
                    ref={promptInpuRef}
                    id='transcription_prompt'
                    className='h-20 leading-relaxed resize-none'
                    placeholder='Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)'
                />
            </div>

            <Button
                data-success={status === 'success'}
                disabled={status != 'waiting'}
                type='submit'
                className='w-full data-[success=true]:bg-emerald-400'>
                {status === 'waiting' ? (
                    <>
                        Carregar vídeo
                        <Upload className='h-4 w-4 ml-2' />
                    </>
                ) : statusMesages[status]}

            </Button>

        </form>
    )
}