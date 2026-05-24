import re

with open(r"c:\Users\sanat\OneDrive\Desktop\PROJECTS\EmpathI\frontend\src\pages\CampaignCreationPage.jsx", "r", encoding="utf-8") as f:
    create_page = f.read()

with open(r"c:\Users\sanat\OneDrive\Desktop\PROJECTS\EmpathI\frontend\src\pages\CampaignEditPage.jsx", "r", encoding="utf-8") as f:
    edit_page_old = f.read()

# 1. Change component name
create_page = create_page.replace("function CampaignCreationPage() {", "function CampaignEditPage() {")
create_page = create_page.replace("export default CampaignCreationPage;", "export default CampaignEditPage;")

# 2. Add useParams
create_page = create_page.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useParams } from 'react-router-dom';")
create_page = create_page.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n  const { id } = useParams();\n  const [fetching, setFetching] = useState(true);")

# 3. Handle localStorage
create_page = create_page.replace("'campaignCreationData'", "`campaignEditData_${id}`")
create_page = create_page.replace("if (saved) {", "if (saved) {")

# 4. Inject fetch hook inside CampaignEditPage
fetch_hook = """
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setFetching(true);
        const campaign = await apiService.getCampaignDetails(profile?.accessToken, id);
        
        // Ensure only the creator or admin can edit
        const isCreator = profile?.backendUserId ? Number(profile.backendUserId) === Number(campaign.created_by) : false;
        if (!isCreator && profile?.userRole !== 'admin') {
          setError('You are not authorized to edit this campaign.');
          setFetching(false);
          return;
        }

        const saved = localStorage.getItem(`campaignEditData_${id}`);
        let localData = null;
        if (saved) {
          try { localData = JSON.parse(saved); } catch(e) {}
        }

        if (!saved) {
            setFormData({
            title: campaign.title || '',
            description: campaign.description || '',
            category_id: campaign.category_id || '',
            subcategory_id: campaign.subcategory_id || '',
            city: campaign.city || '',
            goal_amount: campaign.goal_amount || '',
            urgency_level: campaign.urgency_level || 'MEDIUM',
            cover_image: campaign.cover_image || null,
            deadline: campaign.deadline ? new Date(campaign.deadline).toISOString().slice(0, 16) : '',
            verification_doc_url: campaign.verification_doc_url || null,
            verification_ocr_text: campaign.verification_ocr_text || ''
            });
        }
      } catch (err) {
        console.error('Failed to fetch campaign:', err);
        setError('Failed to load campaign details.');
      } finally {
        setFetching(false);
      }
    };

    if (id && profile?.accessToken) {
      fetchCampaign();
    }
  }, [id, profile?.accessToken, profile?.backendUserId, profile?.userRole]);
  
  useEffect(() => {
    if (id && !fetching) {
      localStorage.setItem(`campaignEditData_${id}`, JSON.stringify(formData));
    }
  }, [formData, id, fetching]);
"""
create_page = create_page.replace("const [formData, setFormData] = useState(() => {", fetch_hook + "\n  const [formData, setFormData] = useState(() => {")

# 5. Fix handleSubmit
submit_logic = """
      const newCampaign = await apiService.updateCampaign(profile.accessToken, id, campaignData);
      
      if (verificationDocument) {
        try {
          await apiService.uploadCampaignDocument(profile.accessToken, id, verificationDocument);
        } catch (docErr) {
          console.warn("Document upload failed:", docErr);
        }
      }

      localStorage.removeItem(`campaignEditData_${id}`);
      navigate(`/user/campaigns/${id}`);
"""
create_page = re.sub(r'const newCampaign = await apiService\.createCampaign\(.*?\);[\s\S]*?navigate\(\`/user/campaigns/\$\{newCampaign\.id\}\`\);', submit_logic, create_page)

# 6. Buttons replacement
create_page = create_page.replace("Create Campaign", "Update Campaign")
create_page = create_page.replace("Start a campaign to support your community and raise awareness", "Update the details of your campaign")

# 7. Add Close and Delete buttons at the bottom of the form
buttons_html = """
            <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-slate-200">
              <Button type="submit" loading={loading} className="w-full">
                Update Campaign
              </Button>
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={async () => {
                    if (!window.confirm("Are you sure you want to close this campaign?")) return;
                    setLoading(true);
                    await apiService.closeCampaign(profile.accessToken, id);
                    navigate(`/user/campaigns/${id}`);
                }} className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50">
                  Close Campaign
                </Button>
                <Button type="button" variant="outline" onClick={async () => {
                    if (!window.confirm("WARNING: Delete this campaign completely?")) return;
                    setLoading(true);
                    await apiService.deleteCampaign(profile.accessToken, id);
                    navigate('/user/campaigns/my');
                }} className="flex-1 border-red-200 text-red-700 hover:bg-red-50">
                  Delete Campaign
                </Button>
              </div>
            </div>
"""
create_page = re.sub(r'<Button type="submit" loading=\{loading\} className="w-full">\s*Update Campaign\s*</Button>', buttons_html, create_page)

# Add fetching block to return
create_page = create_page.replace('return (', 'if (fetching) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;\n\n  return (')

with open(r"c:\Users\sanat\OneDrive\Desktop\PROJECTS\EmpathI\frontend\src\pages\CampaignEditPage.jsx", "w", encoding="utf-8") as f:
    f.write(create_page)

print("CampaignEditPage.jsx patched successfully.")
