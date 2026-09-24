import { useState, useEffect } from 'react';
import { classService } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { BookOpen, Plus, Users, Clock, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ClassManager() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject: '',
    teacher: '',
    schedule: {
      days: [],
      startTime: '',
      endTime: ''
    }
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll();
      setClasses(response.classes || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingClass) {
        await classService.update(editingClass._id, formData);
        toast.success('Class updated successfully');
      } else {
        await classService.create(formData);
        toast.success('Class created successfully!');
      }
      setShowCreateDialog(false);
      setEditingClass(null);
      setFormData({
        name: '',
        code: '',
        subject: '',
        teacher: '',
        schedule: {
          days: [],
          startTime: '',
          endTime: ''
        }
      });
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error(error.response?.data?.message || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name || '',
      code: classItem.code || '',
      subject: classItem.subject || '',
      teacher: classItem.teacher || '',
      schedule: {
        days: classItem.schedule?.days || [],
        startTime: classItem.schedule?.startTime || '',
        endTime: classItem.schedule?.endTime || '',
      },
    });
    setShowCreateDialog(true);
  };

  const closeDialog = (open) => {
    setShowCreateDialog(open);
    if (!open) {
      setEditingClass(null);
      setFormData({ name: '', code: '', subject: '', teacher: '', schedule: { days: [], startTime: '', endTime: '' } });
    }
  };

  const handleDelete = async (classId) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await classService.delete(classId);
      toast.success('Class deleted successfully');
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(day)
          ? prev.schedule.days.filter(d => d !== day)
          : [...prev.schedule.days, day]
      }
    }));
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classes</h2>
          <p className="text-muted-foreground">Manage your classes and schedules</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Class
        </Button>
      </div>

      {/* Classes Grid */}
      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No classes yet</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <CardDescription>{classItem.code}</CardDescription>
                  </div>
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Subject</p>
                  <p className="text-sm text-muted-foreground">{classItem.subject}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Teacher</p>
                  <p className="text-sm text-muted-foreground">{classItem.teacher}</p>
                </div>

                {classItem.schedule && (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-1">Schedule</p>
                      <div className="flex flex-wrap gap-1">
                        {classItem.schedule.days?.map(day => (
                          <Badge key={day} variant="outline" className="text-xs">
                            {day.substring(0, 3)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {classItem.schedule.startTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {classItem.schedule.startTime} - {classItem.schedule.endTime}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Users className="h-4 w-4" />
                  <span>{classItem.students?.length || 0} students enrolled</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(classItem)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(classItem._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
            <DialogDescription>{editingClass ? 'Update the class details and schedule.' : 'Add a new class to the system.'}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Computer Science 101"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Class Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., CS101"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g., Programming Fundamentals"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher">Teacher Name *</Label>
              <Input
                id="teacher"
                placeholder="e.g., Prof. John Smith"
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Schedule Days</Label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={formData.schedule.days.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDayToggle(day)}
                  >
                    {day.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.schedule.startTime}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, startTime: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.schedule.endTime}
                  onChange={(e) => setFormData({
                    ...formData,
                    schedule: { ...formData.schedule, endTime: e.target.value }
                  })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingClass ? 'Save Changes' : 'Create Class'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
