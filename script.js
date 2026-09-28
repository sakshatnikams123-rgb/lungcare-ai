const imageInput=document.getElementById("imageInput");
const uploadZone=document.getElementById("uploadZone");
const browseButton=document.getElementById("browseButton");
const imagePreview=document.getElementById("imagePreview");
const uploadTitle=document.getElementById("uploadTitle");
const uploadText=document.getElementById("uploadText");
const analyzeButton=document.getElementById("analyzeButton");
const resultMain=document.getElementById("resultMain");
const resultDescription=document.getElementById("resultDescription");
const confidenceText=document.getElementById("confidenceText");
const confidenceBar=document.getElementById("confidenceBar");
const menuToggle=document.getElementById("menuToggle");
const navLinks=document.getElementById("navLinks");
let selectedFile=null;

browseButton.addEventListener("click",e=>{e.stopPropagation();imageInput.click()});
uploadZone.addEventListener("click",e=>{if(e.target!==browseButton)imageInput.click()});
imageInput.addEventListener("change",()=>{if(imageInput.files.length)handleFile(imageInput.files[0])});
["dragenter","dragover"].forEach(n=>uploadZone.addEventListener(n,e=>{e.preventDefault();uploadZone.classList.add("dragging")}));
["dragleave","drop"].forEach(n=>uploadZone.addEventListener(n,e=>{e.preventDefault();uploadZone.classList.remove("dragging")}));
uploadZone.addEventListener("drop",e=>{const f=e.dataTransfer.files[0];if(f&&f.type.startsWith("image/")){selectedFile=f;showPreview(f)}});
function handleFile(file){if(!file.type.startsWith("image/")){alert("Please select a PNG or JPG image.");return}selectedFile=file;showPreview(file)}
function showPreview(file){
  const reader=new FileReader();
  reader.onload=e=>{imagePreview.src=e.target.result;imagePreview.style.display="block";uploadTitle.textContent=file.name;uploadText.textContent="Image selected successfully"};
  reader.readAsDataURL(file);
  resultMain.textContent="Ready";
  resultDescription.textContent="Your image is ready. The AI backend will be connected in the next step.";
  confidenceText.textContent="—";
  confidenceBar.style.width="0%";
}
analyzeButton.addEventListener("click",async()=>{
  if(!selectedFile){alert("Please select an image first.");return}
  analyzeButton.disabled=true;
  analyzeButton.innerHTML="Analyzing <span>...</span>";
  resultMain.textContent="Analyzing";
  resultDescription.textContent="Sending your image to the model...";
  confidenceText.textContent="—";
  confidenceBar.style.width="0%";

  const formData=new FormData();
  formData.append("image",selectedFile);

  try{
    const response=await fetch("/predict",{method:"POST",body:formData});
    const data=await response.json();

    if(!response.ok){
      resultMain.textContent="Error";
      resultDescription.textContent=data.detail||data.error||"Something went wrong.";
      confidenceText.textContent="—";
      confidenceBar.style.width="0%";
    }else{
      resultMain.textContent=data.class;
      resultDescription.textContent="Model prediction based on the uploaded image.";
      confidenceText.textContent=data.confidence+"%";
      confidenceBar.style.width=data.confidence+"%";
    }
  }catch(err){
    resultMain.textContent="Error";
    resultDescription.textContent="Could not reach the prediction server. Is app.py running?";
    confidenceText.textContent="—";
    confidenceBar.style.width="0%";
  }

  analyzeButton.disabled=false;
  analyzeButton.innerHTML='Analyze Image <span>→</span>';
});
menuToggle.addEventListener("click",()=>{const open=navLinks.classList.toggle("open");menuToggle.setAttribute("aria-expanded",open)});
document.querySelectorAll("#navLinks a").forEach(a=>a.addEventListener("click",()=>{navLinks.classList.remove("open");menuToggle.setAttribute("aria-expanded","false")}));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
